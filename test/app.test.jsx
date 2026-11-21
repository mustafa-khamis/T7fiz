import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeApi, createFakeAuthClient, renderApp, TEST_ME } from './render.jsx';
import { safeNextPath } from '../src/features/auth/auth-helpers.js';
import { ApiError } from '../src/lib/api.js';

// Image decoding needs a real browser; the account tests use a stand-in.
vi.mock('../src/lib/images.js', () => ({
  ImageDecodeError: class ImageDecodeError extends Error {},
  squareJpeg: vi.fn(async (file) => {
    if (file.name === 'broken.jpg') {
      const { ImageDecodeError } = await import('../src/lib/images.js');
      throw new ImageDecodeError('unsupported');
    }
    return new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
  }),
}));

const signedIn = () => createFakeAuthClient({ signedIn: true });

describe('language and direction', () => {
  it('starts in Arabic, right-to-left', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'حلقة التحفيظ بنظامها المعروف، أينما كنت' })).toBeTruthy();
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('switches to English left-to-right and remembers the choice', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Switch to English' }));
    expect(await screen.findByRole('heading', { level: 1, name: /The Quran memorization circle you know/ })).toBeTruthy();
    expect(document.documentElement.dir).toBe('ltr');
    expect(window.localStorage.getItem('t7fiz.locale')).toBe('en');
  });

  it('toggles the theme explicitly', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'التبديل إلى المظهر الداكن' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('homepage', () => {
  it('presents the four paths with sign-up links', async () => {
    renderApp('/');
    const section = within((await screen.findByRole('heading', { name: 'ابدأ من هنا', level: 2 })).closest('section'));
    const titles = section.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(titles).toEqual(['الانضمام إلى حلقة', 'إنشاء حلقة', 'مؤسسة تحفيظ مجانية', 'مؤسسة تحفيظ خاصة']);
    expect(section.getAllByRole('link', { name: 'أنشئ حسابًا للبدء' })).toHaveLength(4);
  });

  it('does not offer unbuilt flows as working actions to signed-in users', async () => {
    renderApp('/', { authClient: signedIn() });
    await screen.findByRole('link', { name: 'حسابك' });
    expect(screen.queryByRole('link', { name: 'أنشئ حسابًا للبدء' })).toBeNull();
  });
});

describe('session restore', () => {
  it('restores a session from the refresh cookie on load', async () => {
    const authClient = signedIn();
    renderApp('/', { authClient });
    expect(await screen.findByRole('link', { name: 'حسابك' })).toBeTruthy();
    expect(authClient.refresh).toHaveBeenCalled();
  });

  it('treats a failed refresh as signed out', async () => {
    renderApp('/');
    expect(await screen.findByRole('link', { name: 'تسجيل الدخول' })).toBeTruthy();
  });
});

describe('sign in', () => {
  it('validates before calling the API', async () => {
    const user = userEvent.setup();
    const { authClient } = renderApp('/sign-in');
    await user.click(await screen.findByRole('button', { name: 'تسجيل الدخول' }));
    expect(screen.getByText('اكتب بريدك الإلكتروني.')).toBeTruthy();
    expect(screen.getByText('اكتب كلمة المرور.')).toBeTruthy();
    // Focus moves to the first invalid field, which describes its own error.
    const email = screen.getByLabelText('البريد الإلكتروني');
    expect(document.activeElement).toBe(email);
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toContain(document.querySelector('[id$="-error"]').id);
    expect(authClient.login).not.toHaveBeenCalled();
  });

  it('does not flag a field while typing, flags it on leaving, and clears it once fixed', async () => {
    const user = userEvent.setup();
    renderApp('/sign-in');
    const email = await screen.findByLabelText('البريد الإلكتروني');
    await user.type(email, 'omar@');
    expect(screen.queryByText(/اكتب البريد الإلكتروني بصيغة صحيحة/)).toBeNull();
    await user.tab();
    expect(screen.getByText(/اكتب البريد الإلكتروني بصيغة صحيحة/)).toBeTruthy();
    await user.type(email, 'example.com');
    expect(screen.queryByText(/اكتب البريد الإلكتروني بصيغة صحيحة/)).toBeNull();
  });

  it('shows and hides the password on request', async () => {
    const user = userEvent.setup();
    renderApp('/sign-in');
    const password = await screen.findByLabelText('كلمة المرور');
    expect(password.type).toBe('password');
    const toggle = screen.getByRole('button', { name: 'إظهار كلمة المرور' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await user.click(toggle);
    expect(password.type).toBe('text');
    expect(screen.getByRole('button', { name: 'إخفاء كلمة المرور' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('suggests a fix for a mistyped email domain', async () => {
    const user = userEvent.setup();
    renderApp('/sign-in');
    const email = await screen.findByLabelText('البريد الإلكتروني');
    await user.type(email, 'omar@gmial.com');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'omar@gmail.com' }));
    expect(email.value).toBe('omar@gmail.com');
  });

  it('shows the API error in the current language', async () => {
    const user = userEvent.setup();
    const authClient = createFakeAuthClient();
    authClient.login.mockRejectedValue(new ApiError({ status: 401, code: 'INVALID_CREDENTIALS' }));
    renderApp('/sign-in', { authClient });
    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'a@b.co');
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    expect(await screen.findByText('البريد الإلكتروني أو كلمة المرور غير صحيحة.')).toBeTruthy();
    expect(authClient.login).toHaveBeenCalledWith('a@b.co', 'secret-pass');
  });

  it('signs in and continues to the requested page', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/sign-in?next=%2Faccount');
    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'a@b.co');
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    expect(await screen.findByRole('heading', { name: 'حسابك' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/account');
  });
});

describe('sign up', () => {
  async function fillForm(user, { gender = true, password = 'long-enough' } = {}) {
    await user.type(await screen.findByLabelText('الاسم'), '  عمر  ');
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'omar@example.com');
    await user.type(screen.getByLabelText('كلمة المرور'), password);
    if (gender) await user.click(screen.getByRole('radio', { name: 'ذكر' }));
  }

  it('requires a gender and explains why', async () => {
    const user = userEvent.setup();
    const { authClient } = renderApp('/sign-up');
    await fillForm(user, { gender: false });
    expect(screen.getByText(/تُفصل الحلقات بين الرجال والنساء/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));
    expect(screen.getByText('اختر ذكر أو أنثى.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'ذكر' }));
    expect(authClient.register).not.toHaveBeenCalled();
  });

  it('guides the choice of a new password and refuses common ones', async () => {
    const user = userEvent.setup();
    const { authClient } = renderApp('/sign-up');
    const password = await screen.findByLabelText('كلمة المرور');
    await user.type(password, 'short');
    expect(screen.getByText('قوة كلمة المرور: قصيرة جدًا')).toBeTruthy();
    await user.clear(password);
    await user.type(password, 'password123');
    expect(screen.getByText('قوة كلمة المرور: ضعيفة')).toBeTruthy();
    await user.clear(password);
    await user.type(password, 'quiet river at dawn');
    expect(screen.getByText('قوة كلمة المرور: قوية')).toBeTruthy();
    const rules = within(screen.getByRole('list', { name: 'شروط كلمة المرور' })).getAllByRole('listitem');
    expect(rules.every((rule) => rule.dataset.met === 'true')).toBe(true);

    await user.clear(password);
    await user.type(password, 'password123');
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));
    expect(screen.getByText('كلمة المرور هذه شائعة ويسهل تخمينها. اختر غيرها.')).toBeTruthy();
    expect(authClient.register).not.toHaveBeenCalled();
  });

  it('explains a password the server refuses as common', async () => {
    const user = userEvent.setup();
    const authClient = createFakeAuthClient();
    authClient.register.mockRejectedValue(
      new ApiError({ status: 400, code: 'VALIDATION_FAILED', details: [{ path: 'password', issue: 'password_too_common' }] }),
    );
    renderApp('/sign-up', { authClient });
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('كلمة المرور هذه شائعة ويسهل تخمينها');
    expect(document.activeElement).toBe(alert);
  });

  it('registers through the API and asks the user to confirm their email', async () => {
    const user = userEvent.setup();
    const { authClient } = renderApp('/sign-up');
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));
    expect(await screen.findByRole('heading', { name: 'أدخل رمز التأكيد' })).toBeTruthy();
    expect(screen.getByText(/أرسلنا رمزًا من ٦ أرقام إلى/).textContent).toContain('omar@example.com');
    expect(authClient.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'omar@example.com', password: 'long-enough', displayName: 'عمر', gender: 'male', locale: 'ar' }),
    );
  });
});

describe('email links', () => {
  it('verifies the email once from the link', async () => {
    const { authClient } = renderApp('/verify-email?token=abcdefghijklmnopqrstuvwxyz0123456789ABCD');
    expect(await screen.findByText('تم تأكيد بريدك الإلكتروني.')).toBeTruthy();
    expect(authClient.verifyEmail).toHaveBeenCalledTimes(1);
  });

  it('explains an invalid or used verification link', async () => {
    const authClient = createFakeAuthClient();
    authClient.verifyEmail.mockRejectedValue(new ApiError({ status: 400, code: 'TOKEN_INVALID' }));
    renderApp('/verify-email?token=abcdefghijklmnopqrstuvwxyz0123456789ABCD', { authClient });
    expect(await screen.findByText('رابط التأكيد غير صالح أو انتهت صلاحيته أو استُخدم من قبل.')).toBeTruthy();
  });

  it('resets the password with the token from the link', async () => {
    const user = userEvent.setup();
    const { authClient } = renderApp('/reset-password?token=abcdefghijklmnopqrstuvwxyz0123456789ABCD');
    await user.type(await screen.findByLabelText('كلمة المرور الجديدة'), 'new passphrase');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'new passphrase');
    await user.click(screen.getByRole('button', { name: 'حفظ كلمة المرور' }));
    expect(await screen.findByText(/تم تغيير كلمة المرور/)).toBeTruthy();
    expect(authClient.resetPassword).toHaveBeenCalledWith('abcdefghijklmnopqrstuvwxyz0123456789ABCD', 'new passphrase');
  });
});

describe('Google sign-in return', () => {
  it('shows the reason when Google sign-in failed', async () => {
    renderApp('/auth/callback?error=google_email_unverified');
    expect(await screen.findByText('بريد حساب Google هذا غير مؤكَّد لدى Google.')).toBeTruthy();
  });

  it('completes the session from the cookie and continues', async () => {
    const authClient = createFakeAuthClient();
    // The API set the refresh cookie during the redirect.
    authClient.refresh.mockRejectedValueOnce(new ApiError({ status: 401, code: 'AUTH_SESSION_ENDED' }));
    authClient.setSignedIn(true);
    const { router } = renderApp('/auth/callback?returnTo=%2Faccount', { authClient });
    expect(await screen.findByRole('heading', { name: 'حسابك' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/account');
  });
});

describe('protected routes', () => {
  it('redirect signed-out visitors to sign in, keeping the destination', async () => {
    const { router } = renderApp('/account');
    expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' })).toBeTruthy();
    expect(router.state.location.search).toBe('?next=%2Faccount');
  });

  it('send accounts without a gender to complete their profile first', async () => {
    const user = userEvent.setup();
    const api = createFakeApi({ ...TEST_ME, gender: null, profileComplete: false });
    const { router } = renderApp('/account', { authClient: signedIn(), api });
    expect(await screen.findByRole('heading', { name: 'أكمل بيانات حسابك' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'أنثى' }));
    await user.click(screen.getByRole('button', { name: 'حفظ ومتابعة' }));
    expect(await screen.findByRole('heading', { name: 'حسابك' })).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/api/v1/me/gender', { gender: 'female' });
    expect(router.state.location.pathname).toBe('/account');
  });

  it('only accept same-origin paths as post-sign-in destinations', () => {
    expect(safeNextPath('/account')).toBe('/account');
    expect(safeNextPath('//evil.example')).toBe('/account');
    expect(safeNextPath('https://evil.example')).toBe('/account');
    expect(safeNextPath('/\\evil.example')).toBe('/account');
  });
});

describe('failed verification link', () => {
  it('offers a new link instead of a dead end', async () => {
    const user = userEvent.setup();
    const authClient = createFakeAuthClient();
    renderApp('/verify-email', { authClient });
    expect(await screen.findByText('رابط التأكيد غير صالح أو انتهت صلاحيته أو استُخدم من قبل.')).toBeTruthy();
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'omar@example.com');
    await user.click(screen.getByRole('button', { name: 'إرسال رابط جديد' }));
    expect(await screen.findByText(/فستصلك رسالة فيها رابط جديد/)).toBeTruthy();
    expect(authClient.resendVerification).toHaveBeenCalledWith('omar@example.com');
  });
});

describe('account page', () => {
  it('shows the page’s own skeleton while loading, not a loading message', async () => {
    const api = createFakeApi();
    api.get.mockImplementation(() => new Promise(() => {}));
    renderApp('/account', { authClient: signedIn(), api });
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeTruthy());
    const busy = document.querySelector('[aria-busy="true"]');
    expect(busy.textContent).toBe('جارٍ تحميل بيانات حسابك');
    expect(busy.querySelector('.visually-hidden')).toBeTruthy();
    expect(screen.queryByText('جارٍ التحميل…')).toBeNull();
  });

  it('uploads, shows, and removes a profile picture', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    renderApp('/account', { authClient: signedIn(), api });
    const add = await screen.findByRole('button', { name: 'إضافة صورة' });
    expect(add).toBeTruthy();

    await user.upload(screen.getByTestId('avatar-input'), new File(['raw'], 'me.jpg', { type: 'image/jpeg' }));
    const picture = await screen.findByRole('img', { name: 'صورتك الشخصية' });
    expect(picture.getAttribute('src')).toBe('https://storage.test/media-1.jpg');
    expect(api.upload).toHaveBeenCalledWith('avatar', expect.any(Blob));
    expect(api.put).toHaveBeenCalledWith('/api/v1/me/avatar', { mediaId: 'media-1' });

    await user.click(screen.getByRole('button', { name: 'إزالة الصورة' }));
    await waitFor(() => expect(screen.queryByRole('img', { name: 'صورتك الشخصية' })).toBeNull());
    expect(api.delete).toHaveBeenCalledWith('/api/v1/me/avatar');
  });

  it('explains an unreadable picture and a server refusal', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    renderApp('/account', { authClient: signedIn(), api });
    await screen.findByRole('button', { name: 'إضافة صورة' });
    await user.upload(screen.getByTestId('avatar-input'), new File(['x'], 'broken.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText('تعذّرت قراءة هذه الصورة. جرّب صورة بصيغة JPEG أو PNG.')).toBeTruthy();

    api.upload.mockRejectedValueOnce(new ApiError({ status: 413, code: 'MEDIA_TOO_LARGE' }));
    await user.upload(screen.getByTestId('avatar-input'), new File(['x'], 'big.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText('الملف أكبر من الحجم المسموح.')).toBeTruthy();
  });

  it('loads the account and saves only changed fields', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    renderApp('/account', { authClient: signedIn(), api });
    const name = await screen.findByLabelText('الاسم');
    expect(name.value).toBe('فاطمة');
    // Email and gender are shown, not editable here.
    expect(screen.getByText('أنثى')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'الجنس' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'البريد الإلكتروني' })).toBeNull();

    await user.clear(name);
    await user.type(name, 'فاطمة الزهراء');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByText('حُفظت التغييرات.')).toBeTruthy();
    expect(api.patch).toHaveBeenCalledWith('/api/v1/me', { displayName: 'فاطمة الزهراء' });
  });

  it('asks unverified users to confirm their email with the code', async () => {
    const user = userEvent.setup();
    const authClient = signedIn();
    const api = createFakeApi({ ...TEST_ME, emailVerified: false });
    const { router } = renderApp('/account', { authClient, api });
    expect(await screen.findByText(/لم تؤكّد بريدك الإلكتروني بعد/)).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'أدخل رمز التأكيد' }));
    await user.type(await screen.findByLabelText('رمز التأكيد'), '123456');
    // Already signed in: confirmed only, then back to the account.
    await waitFor(() => expect(authClient.verifyEmailCode).toHaveBeenCalledWith(TEST_ME.email, '123456', false));
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'));
  });

  it('applies a language change saved to the account', async () => {
    const user = userEvent.setup();
    renderApp('/account', { authClient: signedIn() });
    await user.selectOptions(await screen.findByLabelText('اللغة'), 'en');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'));
  });

  it('offers a retry when the account cannot be loaded', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    // Only the account request fails, once (the header's notification count still loads).
    const normal = api.get.getMockImplementation();
    let failed = false;
    api.get.mockImplementation(async (path) => {
      if (path === '/api/v1/me' && !failed) {
        failed = true;
        throw new ApiError({ status: 0, code: 'NETWORK_ERROR' });
      }
      return normal(path);
    });
    renderApp('/account', { authClient: signedIn(), api });
    expect(await screen.findByText('تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(await screen.findByLabelText('الاسم')).toBeTruthy();
  });

  it('signs out through the API', async () => {
    const user = userEvent.setup();
    const authClient = signedIn();
    renderApp('/account', { authClient });
    await user.click(await screen.findByRole('button', { name: 'تسجيل الخروج' }));
    expect(authClient.logout).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' })).toBeTruthy();
  });
});

describe('404 and legal pages', () => {
  it('shows the lost-caravan page with the requested link and ways back', async () => {
    renderApp('/no/such/page?x=1');
    expect(await screen.findByRole('heading', { level: 1, name: 'ضلَّت القافلة طريقها' })).toBeTruthy();
    expect(screen.getByText('/no/such/page?x=1')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'العودة إلى الرئيسية' }).getAttribute('href')).toBe('/');
  });

  it('renders the privacy policy and terms in the active language, marked as drafts', async () => {
    const user = userEvent.setup();
    renderApp('/privacy');
    expect(await screen.findByRole('heading', { level: 1, name: 'سياسة الخصوصية' })).toBeTruthy();
    expect(screen.getByText('نص تجريبي قيد المراجعة')).toBeTruthy();
    const toc = screen.getByRole('navigation', { name: 'المحتويات' });
    expect(within(toc).getByRole('link', { name: 'الجلسات الصوتية' }).getAttribute('href')).toBe('#voice');
    await user.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy policy' })).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'Read the terms of use' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Terms of use' })).toBeTruthy();
  });

  it('links the legal documents from every page footer', async () => {
    renderApp('/');
    const footer = await screen.findByRole('navigation', { name: 'الوثائق القانونية' });
    expect(within(footer).getByRole('link', { name: 'سياسة الخصوصية' }).getAttribute('href')).toBe('/privacy');
    expect(within(footer).getByRole('link', { name: 'شروط الاستخدام' }).getAttribute('href')).toBe('/terms');
  });
});

describe('platform administration', () => {
  function adminApi({ roles = ['platform_admin'] } = {}) {
    const api = createFakeApi({ ...TEST_ME, gender: 'male', platformRoles: roles });
    const me = api.get.getMockImplementation();
    const approvals = [];
    api.get.mockImplementation(async (path, options) => {
      if (path === '/api/v1/admin/sheikh-approvals') return approvals;
      if (path.startsWith('/api/v1/admin/sheikh-applications')) return [];
      if (path.startsWith('/api/v1/admin/institutions')) return path.includes('pending_review') ? [{ id: 'i1', name: 'معهد النور', kind: 'free', audience: 'both', status: 'pending_review', createdAt: '2026-11-18T08:00:00Z', creatorName: 'خالد' }] : [];
      if (path.startsWith('/api/v1/admin/main-circles')) return [];
      return me(path, options);
    });
    api.post.mockImplementation(async (path, body) => {
      if (path === '/api/v1/admin/sheikh-approvals') {
        if (body.email === 'unknown@example.com') throw new ApiError({ status: 404, code: 'USER_NOT_FOUND' });
        return { id: 'a1', sheikh: { id: 's1', name: 'الشيخ أحمد', gender: 'male' }, authorityType: 'platform', status: 'active', createdAt: '2026-11-18T08:00:00Z' };
      }
      if (path === '/api/v1/admin/institutions/i1/review') return { id: 'i1', name: 'معهد النور', kind: 'free', audience: 'both', status: body.decision === 'approve' ? 'active' : 'rejected', createdAt: '2026-11-18T08:00:00Z' };
      return undefined;
    });
    return api;
  }

  it('approves a Sheikh by email and lists the approval', async () => {
    const user = userEvent.setup();
    const api = adminApi();
    renderApp('/admin', { authClient: signedIn(), api });
    expect(await screen.findByRole('heading', { level: 1, name: 'إدارة المنصة' })).toBeTruthy();
    // Applications open first; direct approvals are in their own tab.
    expect(await screen.findByText('لا توجد طلبات في هذه الحالة')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'اعتماد المشايخ' }));
    expect(await screen.findByText('لا يوجد مشايخ معتمدون بعد')).toBeTruthy();

    await user.type(screen.getByLabelText('بريد الشيخ'), 'unknown@example.com');
    await user.click(screen.getByRole('button', { name: 'اعتماد' }));
    expect(await screen.findByRole('alert')).toBeTruthy();

    await user.clear(screen.getByLabelText('بريد الشيخ'));
    await user.type(screen.getByLabelText('بريد الشيخ'), 'sheikh@example.com');
    await user.click(screen.getByRole('button', { name: 'اعتماد' }));
    expect(await screen.findByText('اعتُمد الشيخ أحمد.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'الشيخ أحمد' })).toBeTruthy();
  });

  it('reviews a pending institution from its tab', async () => {
    const user = userEvent.setup();
    renderApp('/admin', { authClient: signedIn(), api: adminApi() });
    const tab = await screen.findByRole('tab', { name: /المؤسسات/ });
    await user.click(tab);
    expect(await screen.findByRole('heading', { level: 3, name: 'معهد النور' })).toBeTruthy();
    const card = screen.getByRole('article');
    await user.click(within(card).getByRole('button', { name: 'اعتماد' }));
    await waitFor(() => expect(within(card).getByText('نشط')).toBeTruthy());
  });

  it('is not advertised to people without an administrative role', async () => {
    renderApp('/admin', { authClient: signedIn(), api: adminApi({ roles: [] }) });
    expect(await screen.findByRole('heading', { level: 1, name: 'ضلَّت القافلة طريقها' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'الإدارة' })).toBeNull();
  });
});

describe('finding and joining circles', () => {
  const baseCircle = {
    id: 'c1',
    name: 'حلقة الفجر',
    description: 'تسميع يومي بعد الفجر.',
    gender: 'female',
    mainCircle: { id: 'm1', name: 'حلقات النور', status: 'active' },
    institution: null,
    teachingLanguage: 'ar',
    timeZone: 'Africa/Khartoum',
    requirements: null,
    capacity: 10,
    activeCount: 4,
    seatsAvailable: 6,
    enrollmentPolicy: 'open',
    effectiveEnrollment: 'open',
    acceptingMembers: true,
    status: 'active',
    sheikhs: [{ appointmentId: 'a1', userId: 's1', role: 'primary', name: 'الشيخة مريم' }],
    myMembership: null,
    canManage: false,
    isSheikh: false,
    createdAt: '2026-11-18T08:00:00Z',
  };

  function circlesApi(circle = baseCircle) {
    const api = createFakeApi();
    const me = api.get.getMockImplementation();
    let current = { ...circle };
    api.get.mockImplementation(async (path, options) => {
      if (path.startsWith('/api/v1/discover/circles')) {
        const q = new URL(path, 'http://x').searchParams.get('q');
        const items = !q || current.name.includes(q) ? [current] : [];
        return { items, page: 1, pageSize: 18, total: items.length };
      }
      if (path === '/api/v1/circles/c1') return current;
      if (path === '/api/v1/circles/other') throw new ApiError({ status: 404, code: 'CIRCLE_NOT_FOUND' });
      return me(path, options);
    });
    api.post.mockImplementation(async (path) => {
      if (path === '/api/v1/circles/c1/join') {
        const status = current.effectiveEnrollment === 'open' ? 'active' : 'pending';
        current = { ...current, myMembership: { id: 'mm1', status }, activeCount: status === 'active' ? current.activeCount + 1 : current.activeCount };
        return { id: 'mm1', status };
      }
      if (path === '/api/v1/memberships/mm1/cancel') {
        current = { ...current, myMembership: null };
        return { id: 'mm1', status: 'cancelled' };
      }
      return undefined;
    });
    return api;
  }

  it('lists circles with seats and searches as you type', async () => {
    const user = userEvent.setup();
    renderApp('/circles', { authClient: signedIn(), api: circlesApi() });
    expect(await screen.findByRole('link', { name: 'حلقة الفجر' })).toBeTruthy();
    expect(screen.getByText('متبقٍّ 6 من 10 مقعدًا')).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'المقاعد المشغولة' }).getAttribute('aria-valuenow')).toBe('4');
    await user.type(screen.getByLabelText(/بحث/), 'لا يوجد');
    expect(await screen.findByText('لا توجد حلقات مطابقة')).toBeTruthy();
  });

  it('joins an open circle at once', async () => {
    const user = userEvent.setup();
    renderApp('/circles/c1', { authClient: signedIn(), api: circlesApi() });
    await user.click(await screen.findByRole('button', { name: 'انضم الآن' }));
    expect(await screen.findByText('أنت عضو في هذه الحلقة')).toBeTruthy();
  });

  it('sends a request to an approval circle and can withdraw it', async () => {
    const user = userEvent.setup();
    renderApp('/circles/c1', { authClient: signedIn(), api: circlesApi({ ...baseCircle, effectiveEnrollment: 'approval_required', enrollmentPolicy: 'approval_required' }) });
    await user.click(await screen.findByRole('button', { name: 'اطلب الانضمام' }));
    expect(await screen.findByText('طلبك بانتظار موافقة الشيخ')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'إلغاء الطلب' }));
    expect(await screen.findByRole('button', { name: 'اطلب الانضمام' })).toBeTruthy();
  });

  it('says a full circle is full instead of offering to join', async () => {
    renderApp('/circles/c1', { authClient: signedIn(), api: circlesApi({ ...baseCircle, activeCount: 10, seatsAvailable: 0, acceptingMembers: false }) });
    expect(await screen.findByText('الحلقة مكتملة حاليًا.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'انضم الآن' })).toBeNull();
  });

  it('shows the not-found page for circles the API hides (other gender, private)', async () => {
    renderApp('/circles/other', { authClient: signedIn(), api: circlesApi() });
    expect(await screen.findByRole('heading', { level: 1, name: 'ضلَّت القافلة طريقها' })).toBeTruthy();
  });
});

describe('account circles', () => {
  it('shows an invitation and accepts it', async () => {
    const user = userEvent.setup();
    const api = createFakeApi();
    let invitations = [{ id: 'v1', role: 'student', place: { name: 'حلقة الضحى' }, inviterName: 'الشيخة سعاد', expiresAt: '2026-12-01T00:00:00Z' }];
    const base = api.get.getMockImplementation();
    api.get.mockImplementation(async (path, options) => (path === '/api/v1/me/invitations' ? invitations : base(path, options)));
    api.post.mockImplementation(async (path) => {
      if (path === '/api/v1/invitations/v1/accept') {
        invitations = [];
        return { status: 'accepted', role: 'student' };
      }
      return undefined;
    });
    renderApp('/account', { authClient: signedIn(), api });
    expect(await screen.findByText('دعوة للانضمام إلى «حلقة الضحى»')).toBeTruthy();
    expect(screen.getByText('لم تنضم إلى أي حلقة بعد')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'قبول' }));
    await waitFor(() => expect(screen.queryByText('دعوة للانضمام إلى «حلقة الضحى»')).toBeNull());
    expect(api.post).toHaveBeenCalledWith('/api/v1/invitations/v1/accept', {});
  });
});

describe('managing circles', () => {
  function manageApi({ approved = false } = {}) {
    const api = createFakeApi({ ...TEST_ME, gender: 'male' });
    const base = api.get.getMockImplementation();
    const created = { id: 'i9', kind: 'free', name: 'معهد الفرقان', description: null, audience: 'both', status: 'pending_review', myRole: 'owner', managers: [{ id: 'm', userId: 'u', role: 'owner', name: 'فاطمة' }], mainCircles: [], createdAt: '2026-11-18T08:00:00Z' };
    api.get.mockImplementation(async (path, options) => {
      if (path === '/api/v1/me/sheikh-approvals') return approved ? [{ id: 'a', authorityType: 'platform', status: 'active' }] : [];
      if (path === '/api/v1/institutions/i9') return created;
      if (path === '/api/v1/institutions/i9/sheikh-approvals') return [];
      return base(path, options);
    });
    api.post.mockImplementation(async (path) => (path === '/api/v1/institutions' ? created : undefined));
    return api;
  }

  it('explains that an independent circle needs Sheikh approval', async () => {
    renderApp('/manage', { authClient: signedIn(), api: manageApi() });
    expect(await screen.findByText('إنشاء حلقة مستقلة يتطلب اعتمادك شيخًا')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'إنشاء حلقة مستقلة' })).toBeNull();
    expect(screen.getByRole('link', { name: 'إنشاء مؤسسة' })).toBeTruthy();
  });

  it('offers independent circles once approved', async () => {
    renderApp('/manage', { authClient: signedIn(), api: manageApi({ approved: true }) });
    expect(await screen.findByRole('link', { name: 'إنشاء حلقة مستقلة' })).toBeTruthy();
  });

  it('creates an institution and opens it, under review', async () => {
    const user = userEvent.setup();
    const api = manageApi();
    const { router } = renderApp('/institutions/new', { authClient: signedIn(), api });
    await user.click(await screen.findByRole('button', { name: 'إرسال طلب المؤسسة' }));
    expect(screen.getByText('اكتب اسمًا من حرفين على الأقل.')).toBeTruthy();
    await user.type(screen.getByLabelText('اسم المؤسسة'), 'معهد الفرقان');
    await user.click(screen.getByRole('button', { name: 'إرسال طلب المؤسسة' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/institutions/i9'));
    expect(api.post).toHaveBeenCalledWith('/api/v1/institutions', expect.objectContaining({ kind: 'free', name: 'معهد الفرقان', audience: 'both' }));
    expect(await screen.findByText('قيد المراجعة', { selector: 'p' })).toBeTruthy();
  });
});

describe('Sheikh applications', () => {
  const draft = {
    id: 'ap1',
    authority: { type: 'platform' },
    applicant: { id: 'u1', name: 'فاطمة' },
    fullName: 'فاطمة أحمد',
    phone: null,
    memorizedJuzCount: 10,
    memorizationLevel: 'partial',
    riwayah: null,
    recitationExperience: null,
    teachingExperienceYears: null,
    teachingExperience: null,
    additionalInfo: null,
    codeOfConductAccepted: false,
    status: 'draft',
    submittedAt: null,
    decision: null,
    appeal: null,
    canAppeal: false,
    canReview: false,
    qualifications: [],
    files: [],
    events: [],
    createdAt: '2026-11-18T08:00:00Z',
    updatedAt: '2026-11-18T08:00:00Z',
  };

  function applicationsApi(application = draft) {
    const api = createFakeApi();
    const base = api.get.getMockImplementation();
    let current = { ...application };
    api.get.mockImplementation(async (path, options) => {
      if (path === '/api/v1/me/sheikh-applications') return [];
      if (path === '/api/v1/sheikh-applications/ap1') return current;
      return base(path, options);
    });
    api.post.mockImplementation(async (path, body) => {
      if (path === '/api/v1/sheikh-applications') return current;
      if (path === '/api/v1/sheikh-applications/ap1/review') {
        current = { ...current, status: body.action === 'reject' ? 'rejected' : current.status, decision: body.action === 'reject' ? { reasonCode: body.reasonCode, explanation: body.explanation } : null };
        return current;
      }
      return current;
    });
    api.patch = vi.fn(async (_path, body) => {
      current = { ...current, ...body, codeOfConductAccepted: current.codeOfConductAccepted || Boolean(body.acceptCodeOfConduct) };
      return current;
    });
    return api;
  }

  it('starts an application and only allows submitting with a recording and the code of conduct', async () => {
    const user = userEvent.setup();
    const api = applicationsApi();
    const { router } = renderApp('/apply', { authClient: signedIn(), api });
    await user.click(await screen.findByRole('button', { name: 'ابدأ طلبًا إلى منصة تحفيظ' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/apply/ap1'));
    const submit = await screen.findByRole('button', { name: 'إرسال الطلب' });
    expect(submit.disabled).toBe(true);
    expect(screen.getByText('أضف تسجيل التلاوة قبل الإرسال.')).toBeTruthy();
    await user.click(screen.getByLabelText('قرأت ميثاق المعلّم وألتزم به'));
    expect(submit.disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByText('حُفظ الطلب.')).toBeTruthy();
    expect(api.patch).toHaveBeenCalledWith('/api/v1/sheikh-applications/ap1', expect.objectContaining({ fullName: 'فاطمة أحمد', memorizedJuzCount: 10, acceptCodeOfConduct: true }));
  });

  it('lets a reviewer reject only with a written explanation', async () => {
    const user = userEvent.setup();
    const api = applicationsApi({ ...draft, status: 'under_review', canReview: true, submittedAt: '2026-11-18T09:00:00Z', codeOfConductAccepted: true, applicant: { id: 'u2', name: 'مريم', gender: 'female' } });
    renderApp('/apply/ap1', { authClient: signedIn(), api });
    await user.click(await screen.findByRole('button', { name: 'عدم الاعتماد' }));
    const confirm = screen.getByRole('button', { name: 'تأكيد القرار' });
    expect(confirm.disabled).toBe(true);
    await user.type(screen.getByLabelText('توضيح القرار للمتقدّم'), 'التلاوة تحتاج مراجعة أحكام المد.');
    expect(confirm.disabled).toBe(false);
    await user.click(confirm);
    expect(api.post).toHaveBeenCalledWith('/api/v1/sheikh-applications/ap1/review', { action: 'reject', reasonCode: 'recitation_quality', explanation: 'التلاوة تحتاج مراجعة أحكام المد.' });
  });
});
