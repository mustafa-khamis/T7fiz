import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeApi, createFakeAuthClient, renderApp } from './render.jsx';

describe('notifications', () => {
  it('shows the unread count on the bell and marks everything read', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    const normal = api.get.getMockImplementation();
    const items = [
      { id: 'n1', kind: 'membership.approve', payload: { circleId: 'c1' }, read: false, at: '2026-11-18T10:00:00.000Z' },
      { id: 'n2', kind: 'something.new', payload: {}, read: true, at: '2026-11-17T10:00:00.000Z' },
    ];
    api.get.mockImplementation(async (path) => {
      if (path === '/api/v1/me/notifications/unread-count') return { unread: 1 };
      if (path === '/api/v1/me/notifications') return items;
      return normal(path);
    });
    api.post.mockImplementation(async () => undefined);
    renderApp('/notifications', { authClient: createFakeAuthClient({ signedIn: true }), api });

    expect(await screen.findByRole('link', { name: 'الإشعارات، واحد غير مقروء' })).toBeTruthy();
    const accepted = await screen.findByText('قُبل طلب انضمامك إلى حلقة');
    expect(within(accepted.closest('li')).getByRole('link', { name: 'عرض' }).getAttribute('href')).toBe('/circles/c1');
    expect(screen.getByText('تحديث')).toBeTruthy(); // unknown kinds still read sensibly
    await user.click(screen.getByRole('button', { name: 'تعليم الكل كمقروء' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/me/notifications/read', {}));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'تعليم الكل كمقروء' })).toBeNull());
  });
});
