import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeApi, createFakeAuthClient, renderApp } from './render.jsx';
import { slotsFromWeek, weekFromSlots, zonedDay } from '../src/features/schedule/week.js';

const signedIn = () => createFakeAuthClient({ signedIn: true });
const CIRCLE = 'c1c1c1c1-0000-4000-8000-000000000001';

describe('weekly timetable helpers', () => {
  it('round-trips slots and finds the weekday in the circle time zone', () => {
    const slots = [
      { weekday: 1, localStart: '18:00', durationMinutes: 60 },
      { weekday: 6, localStart: '06:30', durationMinutes: 90 },
    ];
    expect(slotsFromWeek(weekFromSlots(slots))).toEqual(slots);
    // 2026-11-20 22:30 UTC is already Saturday 01:30 in Riyadh.
    expect(zonedDay('2026-11-20T22:30:00Z', 'Asia/Riyadh')).toEqual({ weekday: 6, date: '2026-11-21' });
  });
});

describe('creating a circle (wizard)', () => {
  it('walks through about → timetable → students → review and creates everything in one request', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    api.post.mockImplementation(async () => ({ id: 'm1', status: 'pending_review' }));
    renderApp('/main-circles/new', { authClient: signedIn(), api });

    expect(await screen.findByText('الخطوة 1 من 4')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'التالي' }));
    expect(await screen.findByText('اكتب اسمًا من حرفين على الأقل.')).toBeTruthy();
    expect(screen.getByText('الخطوة 1 من 4')).toBeTruthy();
    await user.type(screen.getByLabelText('اسم الحلقة الرئيسية'), 'حلقة الفجر');
    await user.click(screen.getByRole('button', { name: 'التالي' }));

    // Timetable: Friday is a day off by default; one time for every day.
    expect(await screen.findByText('الخطوة 2 من 4')).toBeTruthy();
    expect(screen.getByRole('switch', { name: /الجمعة/ }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('switch', { name: /السبت/ }).getAttribute('aria-checked')).toBe('true');
    const common = screen.getByRole('group', { name: 'وقت واحد لكل الأيام' });
    await user.selectOptions(within(common).getByLabelText('الساعة'), '7');
    await user.selectOptions(within(common).getByLabelText('المدة'), '90');
    await user.click(within(common).getByRole('button', { name: 'تطبيق على كل الأيام' }));
    await user.click(screen.getByRole('switch', { name: /الخميس/ }));
    await user.click(screen.getByRole('button', { name: 'التالي' }));

    // Students: an independent circle is public — open or by approval only.
    expect(await screen.findByText('الخطوة 3 من 4')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await user.click(screen.getByRole('radio', { name: /انضمام مباشر/ }));
    await user.click(screen.getByRole('button', { name: 'التالي' }));

    expect(await screen.findByText('الخطوة 4 من 4')).toBeTruthy();
    expect(screen.getByText(/الإجازة: الخميس، الجمعة/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'إنشاء الحلقة' }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const [path, body] = api.post.mock.calls.at(-1);
    expect(path).toBe('/api/v1/main-circles');
    expect(body.name).toBe('حلقة الفجر');
    expect(body.firstCircle.enrollmentPolicy).toBe('open');
    expect(body.firstCircle.schedule.map((s) => s.weekday)).toEqual([1, 2, 3, 6, 7]);
    expect(body.firstCircle.schedule.every((s) => s.localStart === '19:00' && s.durationMinutes === 90)).toBe(true);
  });
});

describe('circle timetable', () => {
  const circle = {
    id: CIRCLE, name: 'حلقة الفجر', description: null, status: 'active', enrollmentPolicy: 'open', capacity: 20, activeCount: 3, teachingLanguage: 'ar', timeZone: 'Africa/Khartoum', requirements: null,
    sheikhs: [{ appointmentId: 'ap1', userId: 'sh1', name: 'الشيخة عائشة', role: 'primary' }], mainCircle: { id: 'm1', name: 'المركز' }, institution: null,
    myMembership: null, canManage: false, isSheikh: true,
  };
  const slots = [
    { id: 's6', weekday: 6, localStart: '18:00', durationMinutes: 60 },
    { id: 's7', weekday: 7, localStart: '18:00', durationMinutes: 60 },
  ];

  it('lists sessions by weekday and time, never by date, and saves the whole week at once', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    const fallback = api.get.getMockImplementation();
    api.get.mockImplementation(async (path) => {
      if (path === `/api/v1/circles/${CIRCLE}`) return circle;
      if (path === `/api/v1/circles/${CIRCLE}/schedules`) return slots;
      if (path.startsWith(`/api/v1/circles/${CIRCLE}/`)) return [];
      return fallback(path);
    });
    api.put.mockImplementation(async (_path, body) => body.slots.map((s, i) => ({ id: `n${i}`, ...s })));
    renderApp(`/circles/${CIRCLE}`, { authClient: signedIn(), api });

    const sessions = await screen.findByRole('region', { name: 'الجلسات' });
    expect(await within(sessions).findByText('السبت')).toBeTruthy();
    expect(within(sessions).getAllByText(/6:00 م · ساعة/).length).toBe(2);
    expect(within(sessions).queryByText(/نوفمبر|2026/)).toBeNull();

    const timetable = screen.getByLabelText('المواعيد الأسبوعية');
    const save = within(timetable).getByRole('button', { name: 'حفظ الجدول' });
    expect(save.disabled).toBe(true);
    await user.click(within(timetable).getByRole('switch', { name: /الاثنين/ }));
    expect(save.disabled).toBe(false);
    await user.click(save);
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`/api/v1/circles/${CIRCLE}/schedule`, { slots: [{ weekday: 1, localStart: '18:00', durationMinutes: 60 }, { weekday: 6, localStart: '18:00', durationMinutes: 60 }, { weekday: 7, localStart: '18:00', durationMinutes: 60 }] }));
    expect(await within(timetable).findByText(/حُفظ الجدول/)).toBeTruthy();
  });
});
