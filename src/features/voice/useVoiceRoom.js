import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';

/**
 * One audio room (docs/SYSTEM_ARCHITECTURE.md §7.4). The API decides who may
 * join and who may speak; this hook only connects with the token it is given
 * and follows permission changes the server pushes (floor granted or taken).
 *
 * The LiveKit SDK is loaded on demand, so pages without voice never download it.
 * Remote audio plays through <audio> elements appended to `audioContainer`.
 *
 * status: idle | connecting | connected | reconnecting | closed | error
 */
const initial = { status: 'idle', error: null, participants: [], canPublish: false, micOn: false, audioBlocked: false, identity: null };

/** The role the API put in the join token (read-only for participants). */
function roleOf(participant) {
  try {
    return JSON.parse(participant.metadata || '{}').role ?? null;
  } catch {
    return null;
  }
}

function describe(participant, isLocal) {
  return {
    role: roleOf(participant),
    identity: participant.identity,
    name: participant.name || '',
    isLocal,
    speaking: Boolean(participant.isSpeaking),
    micOn: Boolean(participant.isMicrophoneEnabled),
    canPublish: Boolean(participant.permissions?.canPublish),
  };
}

export function useVoiceRoom(tokenPath) {
  const { api } = useAuth();
  const [state, setState] = useState(initial);
  const roomRef = useRef(null);
  const audioRef = useRef(null);
  const leavingRef = useRef(false);

  const snapshot = useCallback((room) => {
    if (roomRef.current !== room) return;
    const local = room.localParticipant;
    setState((previous) => ({
      ...previous,
      identity: local.identity,
      canPublish: Boolean(local.permissions?.canPublish),
      micOn: Boolean(local.isMicrophoneEnabled),
      audioBlocked: !room.canPlaybackAudio,
      participants: [describe(local, true), ...[...room.remoteParticipants.values()].map((p) => describe(p, false))],
    }));
  }, []);

  const teardown = useCallback(() => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) room.disconnect();
    if (audioRef.current) audioRef.current.replaceChildren();
  }, []);

  /** Enters the room. `{ mic: true }` also opens the microphone when allowed (the Sheikh). */
  const join = useCallback(async (options) => {
    if (roomRef.current) return;
    const openMic = options?.mic === true;
    leavingRef.current = false;
    setState({ ...initial, status: 'connecting' });
    let room;
    try {
      const [lk, grant] = await Promise.all([import('livekit-client'), api.post(tokenPath, {})]);
      const { Room, RoomEvent, DisconnectReason, AudioPresets } = lk;
      room = new Room({
        adaptiveStream: false,
        dynacast: false,
        // Echo cancellation and noise suppression on; one channel (a voice, not a stereo scene).
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        // Recitation is closer to music than to speech: long tones and deliberate pauses.
        // 48 kbps instead of the 24 kbps speech default; no DTX (it cuts pauses and the
        // start of words); RED repeats audio packets so short network losses are not heard.
        publishDefaults: { audioPreset: AudioPresets.music, dtx: false, red: true },
      });
      roomRef.current = room;
      const refresh = () => snapshot(room);
      for (const event of [
        RoomEvent.ParticipantConnected,
        RoomEvent.ParticipantDisconnected,
        RoomEvent.ParticipantNameChanged,
        RoomEvent.ParticipantMetadataChanged,
        RoomEvent.ActiveSpeakersChanged,
        RoomEvent.TrackMuted,
        RoomEvent.TrackUnmuted,
        RoomEvent.LocalTrackPublished,
        RoomEvent.LocalTrackUnpublished,
        RoomEvent.ParticipantPermissionsChanged,
        RoomEvent.AudioPlaybackStatusChanged,
      ]) {
        room.on(event, refresh);
      }
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === 'audio' && audioRef.current) audioRef.current.append(track.attach());
        refresh();
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
        refresh();
      });
      room.on(RoomEvent.Reconnecting, () => roomRef.current === room && setState((s) => ({ ...s, status: 'reconnecting' })));
      room.on(RoomEvent.Reconnected, () => roomRef.current === room && setState((s) => ({ ...s, status: 'connected' })));
      room.on(RoomEvent.Disconnected, (reason) => {
        if (roomRef.current !== room) return;
        roomRef.current = null;
        if (audioRef.current) audioRef.current.replaceChildren();
        // The server closes the room when the session ends or removes a participant.
        const closed = reason === DisconnectReason.ROOM_DELETED || reason === DisconnectReason.PARTICIPANT_REMOVED;
        setState({ ...initial, status: leavingRef.current ? 'idle' : closed ? 'closed' : 'error', error: leavingRef.current || closed ? null : 'connection' });
      });

      await room.connect(grant.url, grant.token, { autoSubscribe: true });
      if (roomRef.current !== room) return;
      setState((s) => ({ ...s, status: 'connected' }));
      if (openMic && room.localParticipant.permissions?.canPublish) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch (error) {
          setState((s) => ({ ...s, error: error?.name === 'NotAllowedError' ? 'micDenied' : 'mic' }));
        }
      }
      snapshot(room);
    } catch (error) {
      if (room && roomRef.current === room) teardown();
      setState({ ...initial, status: 'error', error: error?.code ? error : 'connection' });
    }
  }, [api, tokenPath, snapshot, teardown]);

  const leave = useCallback(() => {
    leavingRef.current = true;
    teardown();
    setState(initial);
  }, [teardown]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
      setState((s) => ({ ...s, error: null }));
    } catch (error) {
      setState((s) => ({ ...s, error: error?.name === 'NotAllowedError' ? 'micDenied' : 'mic' }));
    }
    snapshot(room);
  }, [snapshot]);

  const startAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.startAudio().catch(() => {});
    snapshot(room);
  }, [snapshot]);

  // Callback ref for the element that holds remote <audio> elements.
  const audioContainer = useCallback((element) => {
    audioRef.current = element;
  }, []);

  // Leaving the page leaves the room.
  useEffect(() => teardown, [teardown]);

  return { ...state, join, leave, toggleMic, startAudio, audioContainer };
}
