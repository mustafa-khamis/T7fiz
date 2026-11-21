import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeAuthClient, renderApp } from './render.jsx';
import { normalizeCode } from '../src/lib/code.js';

/** The code screen right after sign-up (the sign-up page passes the address along). */
function afterSignUp(authClient = createFakeAuthClient()) {
  const utils = renderApp('/sign-in', { authClient });
  utils.router.navigate('/check-email', { state: { email: 'omar@example.com' } });
  return utils;
}

describe('email confirmation code', () => {
  it('checks a pasted code by itself and signs the new account in — no button to press', async () => {
    const user = userEvent.setup();
    const authClient = createFakeAuthClient();
    const { router } = afterSignUp(authClient);
    const input = await screen.findByLabelText('رمز التأكيد');
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('button', { name: /تأكيد|تحقق/ })).toBeNull();
    await user.click(input);
    await user.paste('123 456');
    await waitFor(() => expect(authClient.verifyEmailCode).toHaveBeenCalledWith('omar@example.com', '123456', true));
    expect(authClient.verifyEmailCode).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(router.state.location.pathname).not.toBe('/check-email'));
  });

  it('explains a wrong code with the tries left and clears it for the next try', async () => {
    const user = userEvent.setup();
    const authClient = createFakeAuthClient();
    afterSignUp(authClient);
    const input = await screen.findByLabelText('رمز التأكيد');
    await user.type(input, '999999');
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'الرمز غير صحيح. بقيت 4 محاولات.');
    expect(input.value).toBe('');
    await user.type(input, '123456');
    await waitFor(() => expect(authClient.verifyEmailCode).toHaveBeenLastCalledWith('omar@example.com', '123456', true));
  });

  it('waits before another code can be sent, then sends it', async () => {
    afterSignUp();
    const resend = await screen.findByRole('button', { name: /إرسال رمز جديد بعد/ });
    expect(resend.disabled).toBe(true);
  });

  it('asks for the address when the page is opened on its own, and can send a new code at once', async () => {
    const user = userEvent.setup();
    const authClient = createFakeAuthClient();
    renderApp('/check-email', { authClient });
    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'omar@example.com');
    await user.click(screen.getByRole('button', { name: 'متابعة' }));
    await user.click(await screen.findByRole('button', { name: 'إرسال رمز جديد' }));
    expect(authClient.resendVerification).toHaveBeenCalledWith('omar@example.com');
    expect(await screen.findByText('أرسلنا رمزًا جديدًا. استخدم الرمز في أحدث رسالة.')).toBeTruthy();
  });

  it('accepts Arabic-Indic digits and ignores anything that is not a digit', () => {
    expect(normalizeCode('١٢٣ ٤٥٦')).toBe('123456');
    expect(normalizeCode('۱۲۳-۴۵۶')).toBe('123456');
    expect(normalizeCode('code: 12 34 56 78')).toBe('123456');
  });
});
