import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeApi, createFakeAuthClient, renderApp, TEST_ME } from './render.jsx';

const SESSION = 'a1b2c3d4-0000-4000-8000-000000000001';
const CIRCLE = 'c1c1c1c1-0000-4000-8000-000000000001';
const base = { id: SESSION, circleId: CIRCLE, circleName: 'حلقة الفجر', title: null, startsAt: '2026-11-18T15:00:00.000Z', endsAt: '2026-11-18T16:00:00.000Z', status: 'live', guestRequest: null };
const SURAHS = [
  { number: 1, nameAr: 'الفاتحة', nameEn: 'Al-Fatihah', ayahCount: 7 },
  { number: 67, nameAr: 'الملك', nameEn: 'Al-Mulk', ayahCount: 30 },
];

function apiWith(routes) {
  const api = createFakeApi();
  const fallback = api.get.getMockImplementation();
  api.get.mockImplementation(async (path) => {
    const clean = path.split('?')[0];
    if (clean in routes) return typeof routes[clean] === 'function' ? routes[clean](path) : routes[clean];
    return fallback(path);
  });
  api.post.mockImplementation(async () => ({}));
  return api;
}
const signedIn = () => createFakeAuthClient({ signedIn: true });

describe('session room — student', () => {
  it('shows the place in line and the estimate, and leaves the line', async () => {
    const user = userEvent.setup();
    const session = { ...base, role: 'member', myAttendance: 'present', queue: { waitingCount: 3, current: null, mine: { requestId: 'r1', status: 'waiting', position: 2, ahead: 1, estimatedWaitSeconds: 300, inviteExpiresAt: null }, line: [] } };
    const api = apiWith({ [`/api/v1/sessions/${SESSION}`]: session });
    renderApp(`/sessions/${SESSION}`, { authClient: signedIn(), api });
    expect(await screen.findByText('ترتيبك في الدور')).toBeTruthy();
    expect(screen.getByText(/أمامك طالب واحد/)).toBeTruthy();
    expect(screen.getByText(/نحو 5 دقيقة/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'الخروج من الدور' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/queue`));
  });

  it('announces the turn with a countdown and starts the recitation', async () => {
    const user = userEvent.setup();
    const expires = new Date(Date.now() + 90_000).toISOString();
    const session = { ...base, role: 'member', myAttendance: 'present', queue: { waitingCount: 0, current: { requestId: 'r1', studentId: TEST_ME.id, studentName: 'فاطمة', status: 'invited', inviteExpiresAt: expires }, mine: { requestId: 'r1', status: 'invited', position: null, ahead: null, estimatedWaitSeconds: null, inviteExpiresAt: expires }, line: [] } };
    const api = apiWith({ [`/api/v1/sessions/${SESSION}`]: session });
    renderApp(`/sessions/${SESSION}`, { authClient: signedIn(), api });
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('حان دورك')).toBeTruthy();
    expect(within(alert).getByRole('timer').textContent).toMatch(/^1:[234][0-9]$/);
    // The student is not told that someone else is reciting: it is their own turn.
    expect(screen.queryByText(/يُسمِّع الآن/)).toBeNull();
    await user.click(within(alert).getByRole('button', { name: 'ابدأ التسميع' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/queue/start`, {}));
  });

  it('lets a visitor ask to attend as a guest, then shows the pending state', async () => {
    const user = userEvent.setup();
    let session = { ...base, role: 'visitor', myAttendance: null, queue: null };
    const api = apiWith({ [`/api/v1/sessions/${SESSION}`]: () => session });
    api.post.mockImplementation(async () => {
      session = { ...session, guestRequest: { id: 'g1', status: 'pending' } };
      return { id: 'g1', status: 'pending' };
    });
    renderApp(`/sessions/${SESSION}`, { authClient: signedIn(), api });
    await user.type(await screen.findByLabelText(/لماذا تودّ الحضور/), 'زيارة');
    await user.click(screen.getByRole('button', { name: 'طلب الحضور' }));
    expect(await screen.findByText(/طلبك بانتظار موافقة الشيخ/)).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/guests`, { reason: 'زيارة' });
  });
});

describe('session room — Sheikh', () => {
  const live = {
    ...base,
    role: 'staff',
    myAttendance: null,
    queue: { waitingCount: 1, current: { requestId: 'r1', studentId: 's1', studentName: 'مريم', status: 'in_progress', inviteExpiresAt: null }, mine: null, line: [{ requestId: 'r2', studentId: 's2', studentName: 'خديجة', status: 'waiting', kind: 'member' }] },
  };
  const routes = {
    [`/api/v1/sessions/${SESSION}`]: live,
    '/api/v1/quran/surahs': SURAHS,
    [`/api/v1/sessions/${SESSION}/attendance`]: [{ userId: 's1', name: 'مريم', status: 'present', kind: 'member' }],
    [`/api/v1/sessions/${SESSION}/guests`]: [],
  };

  it('refuses an ayah outside the surah before calling the API, then records', async () => {
    const user = userEvent.setup();
    const api = apiWith(routes);
    renderApp(`/sessions/${SESSION}`, { authClient: signedIn(), api });
    const form = await screen.findByRole('form', { name: 'تسجيل تسميع مريم' });
    const to = within(form).getByLabelText('إلى الآية');
    await user.clear(to);
    await user.type(to, '9');
    await user.click(within(form).getByRole('button', { name: 'حفظ وإنهاء' }));
    expect(await within(form).findByText(/راجع أرقام الآيات/)).toBeTruthy();
    expect(api.post).not.toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/recitations`, expect.anything());

    await user.clear(to);
    await user.type(to, '٧');
    await user.click(within(form).getByRole('button', { name: 'حفظ وإنهاء' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/recitations`, {
        studentId: 's1',
        outcome: 'completed',
        quality: 'good',
        ranges: [{ kind: 'new', startSurah: 1, startAyah: 1, endSurah: 1, endAyah: 7 }],
      }),
    );
  });

  it('asks for confirmation before ending the session', async () => {
    const user = userEvent.setup();
    const api = apiWith(routes);
    renderApp(`/sessions/${SESSION}`, { authClient: signedIn(), api });
    await user.click(await screen.findByRole('button', { name: 'إنهاء الجلسة' }));
    expect(api.post).not.toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/close`, {});
    await user.click(screen.getByRole('button', { name: 'نعم، أنهِ الجلسة' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/close`, {}));
  });

  it('marks attendance from the list', async () => {
    const user = userEvent.setup();
    const api = apiWith(routes);
    renderApp(`/sessions/${SESSION}`, { authClient: signedIn(), api });
    await user.selectOptions(await screen.findByLabelText('حضور مريم'), 'late');
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`/api/v1/sessions/${SESSION}/attendance`, { userId: 's1', status: 'late' }));
  });
});

describe('circle page — learning', () => {
  const circle = {
    id: CIRCLE, name: 'حلقة الفجر', description: null, status: 'active', enrollmentPolicy: 'open', capacity: 20, activeCount: 3, teachingLanguage: 'ar', timeZone: 'Africa/Khartoum', requirements: null,
    sheikhs: [{ appointmentId: 'ap1', userId: 'sh1', name: 'الشيخة عائشة', role: 'primary' }], mainCircle: { id: 'm1', name: 'المركز' }, institution: null,
    myMembership: { id: 'mem1', status: 'active' }, canManage: false, isSheikh: false,
  };

  it('shows sessions, progress, chat and classmates for a student', async () => {
    const user = userEvent.setup();
    const api = apiWith({
      [`/api/v1/circles/${CIRCLE}`]: circle,
      [`/api/v1/circles/${CIRCLE}/sessions`]: [{ ...base, status: 'live' }],
      [`/api/v1/circles/${CIRCLE}/progress`]: { attendance: { present: 4, late: 1, absent: 0, excused: 0 }, recitations: { completed: 6, total: 7 }, memorizedAyat: 120, revisionsCompleted: 2 },
      '/api/v1/me/recitations': [{ id: 'rec1', sessionId: SESSION, circle: { id: CIRCLE, name: 'حلقة الفجر' }, sheikhName: 'الشيخة عائشة', outcome: 'completed', quality: 'excellent', feedback: 'أحسنتِ', ranges: [{ kind: 'new', startSurah: 67, startAyah: 1, endSurah: 67, endAyah: 10 }], at: '2026-11-17T15:30:00.000Z' }],
      '/api/v1/quran/surahs': SURAHS,
      [`/api/v1/circles/${CIRCLE}/unread`]: { discussion: 0, announcements: 2 },
      [`/api/v1/circles/${CIRCLE}/messages`]: [{ id: 'msg1', sender: { id: 'sh1', name: 'الشيخة عائشة', staff: true }, body: 'السلام عليكم', deleted: false, mine: false, at: '2026-11-18T10:00:00.000Z' }],
      [`/api/v1/circles/${CIRCLE}/members`]: [{ id: 'mem1', student: { id: TEST_ME.id, name: 'فاطمة' }, status: 'active' }, { id: 'mem2', student: { id: 'x2', name: 'زينب' }, status: 'active' }],
      '/api/v1/me/revisions': [],
    });
    renderApp(`/circles/${CIRCLE}`, { authClient: signedIn(), api });
    expect(await screen.findByRole('link', { name: 'دخول' })).toHaveProperty('pathname', `/sessions/${SESSION}`);
    expect(await screen.findByText('120')).toBeTruthy();
    expect(await screen.findByText(/الملك 1–10/)).toBeTruthy();
    expect(await screen.findByText('السلام عليكم')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /الإعلانات/ }).textContent).toContain('2');

    await user.type(screen.getByLabelText('الرسالة'), 'وعليكم السلام{Enter}');
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/api/v1/circles/${CIRCLE}/messages`, { channel: 'discussion', body: 'وعليكم السلام' }));

    const classmate = await screen.findByLabelText('الزميل');
    expect(within(classmate).queryByText('فاطمة')).toBeNull();
    await user.selectOptions(classmate, 'x2');
    await user.click(screen.getByRole('button', { name: 'إرسال الطلب' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/api/v1/circles/${CIRCLE}/revisions`, { inviteeId: 'x2' }));
  });
});
