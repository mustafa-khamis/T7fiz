import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../src/lib/api.js';
import { createFakeApi, createFakeAuthClient, renderApp, TEST_ME } from './render.jsx';

// A stand-in for the LiveKit SDK: no network, no media devices.
const rooms = [];
vi.mock('livekit-client', () => {
  class Room {
    constructor(options) {
      this.options = options;
      this.handlers = new Map();
      this.canPlaybackAudio = true;
      this.remoteParticipants = new Map();
      this.localParticipant = {
        identity: globalThis.__voiceIdentity,
        name: 'أنا',
        permissions: { canPublish: globalThis.__voiceCanPublish },
        isMicrophoneEnabled: false,
        setMicrophoneEnabled: vi.fn(async (on) => {
          this.localParticipant.isMicrophoneEnabled = on;
        }),
      };
      this.connect = vi.fn(async () => {});
      this.disconnect = vi.fn();
      this.startAudio = vi.fn(async () => {});
      rooms.push(this);
    }
    on(event, handler) {
      if (!this.handlers.has(event)) this.handlers.set(event, []);
      this.handlers.get(event).push(handler);
      return this;
    }
    emit(event, ...args) {
      for (const handler of this.handlers.get(event) ?? []) handler(...args);
    }
  }
  const names = ['ParticipantConnected', 'ParticipantDisconnected', 'ParticipantNameChanged', 'ActiveSpeakersChanged', 'TrackMuted', 'TrackUnmuted', 'LocalTrackPublished', 'LocalTrackUnpublished', 'ParticipantPermissionsChanged', 'AudioPlaybackStatusChanged', 'TrackSubscribed', 'TrackUnsubscribed', 'Reconnecting', 'Reconnected', 'Disconnected'];
  return {
    Room,
    RoomEvent: Object.fromEntries(names.map((n) => [n, n])),
    DisconnectReason: { ROOM_DELETED: 'ROOM_DELETED', PARTICIPANT_REMOVED: 'PARTICIPANT_REMOVED' },
    AudioPresets: { music: { maxBitrate: 48000 } },
  };
});

const SESSION = 'a1b2c3d4-0000-4000-8000-000000000001';
const STUDENT = 'b2b2b2b2-0000-4000-8000-000000000002';
const base = { id: SESSION, circleId: 'c1c1c1c1-0000-4000-8000-000000000001', circleName: 'حلقة الفجر', title: null, startsAt: '2026-11-18T15:00:00.000Z', endsAt: '2026-11-18T16:00:00.000Z', status: 'live', guestRequest: null };
const GRANT = { url: 'wss://voice.test', room: `session-${SESSION}`, token: 'jwt', expiresAt: '2026-11-18T17:00:00.000Z' };
const floorPath = `/api/v1/sessions/${SESSION}/voice/floor`;

function setup({ session, floor = { speakers: [], hands: [] }, canPublish = false, identity = TEST_ME.id }) {
  globalThis.__voiceIdentity = identity;
  globalThis.__voiceCanPublish = canPublish;
  rooms.length = 0;
  const api = createFakeApi();
  const fallback = api.get.getMockImplementation();
  let currentFloor = floor;
  api.get.mockImplementation(async (path) => {
    if (path === `/api/v1/sessions/${SESSION}`) return session;
    // The Sheikh's other panels.
    if (path === `/api/v1/sessions/${SESSION}/attendance` || path === `/api/v1/sessions/${SESSION}/guests` || path === '/api/v1/quran/surahs') return [];
    if (path === floorPath) {
      if (currentFloor instanceof Error) throw currentFloor;
      return currentFloor;
    }
    return fallback(path);
  });
  api.post.mockImplementation(async (path, body) => {
    if (path.endsWith('/voice/token')) return { ...GRANT, canPublish };
    if (path.endsWith('/voice/hand')) {
      currentFloor = { ...currentFloor, hands: body.raised ? [identity] : [] };
      return { raised: body.raised };
    }
    return {};
  });
  renderApp(`/sessions/${SESSION}`, { authClient: createFakeAuthClient({ signedIn: true }), api });
  return { api };
}

describe('session audio', () => {
  it('joins as a listener and raises a hand', async () => {
    const user = userEvent.setup();
    const { api } = setup({ session: { ...base, role: 'member', myAttendance: 'present', queue: { waitingCount: 0, current: null, mine: null, line: [] } } });
    // Already in the session: the page enters the audio room by itself.
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/voice/token`, {}));
    await waitFor(() => expect(rooms[0]?.connect).toHaveBeenCalledWith('wss://voice.test', 'jwt', { autoSubscribe: true }));
    expect(await screen.findByText('متصل')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'مستمع' }).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: /الميكروفون/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'رفع اليد' }));
    expect(api.post).toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/voice/hand`, { raised: true });
    expect(await screen.findByRole('button', { name: 'إنزال اليد' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'مغادرة الصوت' }));
    expect(rooms[0].disconnect).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'الانضمام إلى الصوت' })).toBeTruthy();
  });

  it('follows a floor grant from the server and opens the microphone on request', async () => {
    const user = userEvent.setup();
    setup({ session: { ...base, role: 'member', myAttendance: 'present', queue: { waitingCount: 0, current: null, mine: null, line: [] } } });
    await screen.findByText('متصل');
    const room = rooms[0];
    act(() => {
      room.localParticipant.permissions = { canPublish: true };
      room.emit('ParticipantPermissionsChanged', { canPublish: false }, room.localParticipant);
    });
    expect(await screen.findByText(/يمكنك الكلام الآن/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'الميكروفون مغلق' }));
    expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(await screen.findByRole('button', { name: 'الميكروفون مفتوح', pressed: true })).toBeTruthy();
  });

  it('lets the Sheikh give the floor to a raised hand', async () => {
    const user = userEvent.setup();
    const { api } = setup({ session: { ...base, role: 'staff', myAttendance: null, queue: { waitingCount: 0, current: null, mine: null, line: [] } }, floor: { speakers: [], hands: [STUDENT] }, canPublish: true });
    await screen.findByText('متصل');
    act(() => {
      rooms[0].remoteParticipants.set(STUDENT, { identity: STUDENT, name: 'مريم', permissions: { canPublish: false }, isMicrophoneEnabled: false, isSpeaking: false });
      rooms[0].emit('ParticipantConnected');
    });
    expect(await screen.findByText('يد مرفوعة واحدة')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'منح الكلمة' }));
    expect(api.post).toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/voice/speakers`, { userId: STUDENT, allow: true });
  });

  it('puts the Sheikh in the room with the microphone open, and opens a reciting student’s microphone by itself', async () => {
    const reciting = { requestId: 'r1', studentId: STUDENT, studentName: 'مريم', status: 'in_progress', inviteExpiresAt: null };
    setup({ session: { ...base, role: 'staff', myAttendance: null, queue: { waitingCount: 0, current: reciting, mine: null, line: [] } }, canPublish: true });
    await screen.findByText('متصل');
    await waitFor(() => expect(rooms[0].localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true));
    act(() => {
      rooms[0].remoteParticipants.set(STUDENT, { identity: STUDENT, name: 'مريم', metadata: '{"role":"student"}', permissions: { canPublish: true }, isMicrophoneEnabled: true, isSpeaking: true });
      rooms[0].emit('ParticipantConnected');
    });
    expect(await screen.findByText('يُسمِّع الآن')).toBeTruthy();
  });

  it('opens the microphone when the student’s recitation starts', async () => {
    const mine = { requestId: 'r1', status: 'in_progress', position: null, ahead: null, estimatedWaitSeconds: null, inviteExpiresAt: null };
    setup({ session: { ...base, role: 'member', myAttendance: 'present', queue: { waitingCount: 0, current: { ...mine, studentId: TEST_ME.id, studentName: 'أنا' }, mine, line: [] } }, canPublish: true });
    await screen.findByText('متصل');
    await waitFor(() => expect(rooms[0].localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true));
    expect(await screen.findByRole('button', { name: 'الميكروفون مفتوح', pressed: true })).toBeTruthy();
  });

  it('stays hidden when voice is not configured on the server', async () => {
    setup({ session: { ...base, role: 'staff', myAttendance: null, queue: { waitingCount: 0, current: null, mine: null, line: [] } }, floor: new ApiError({ status: 503, code: 'VOICE_NOT_CONFIGURED' }) });
    expect(await screen.findByRole('heading', { name: 'جلسة الحلقة' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'الانضمام إلى الصوت' })).toBeNull());
  });

  it('is not offered to a student who has not joined the session', async () => {
    setup({ session: { ...base, role: 'member', myAttendance: null, queue: null } });
    expect(await screen.findByRole('button', { name: /انضم/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'الانضمام إلى الصوت' })).toBeNull();
  });
});
