import { lazy, Suspense } from 'react';
import { AuthLayout, PublicLayout } from './layouts.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';
import { HomePage } from '../features/home/HomePage.jsx';
import { SignInPage } from '../features/auth/SignInPage.jsx';
import { SignUpPage } from '../features/auth/SignUpPage.jsx';
import { CheckEmailPage } from '../features/auth/CheckEmailPage.jsx';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage.jsx';
import { AuthCallbackPage } from '../features/auth/AuthCallbackPage.jsx';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage.jsx';
import { CompleteProfilePage } from '../features/auth/CompleteProfilePage.jsx';
import { RequireAuth } from '../features/auth/RequireAuth.jsx';
import { AccountSkeleton } from '../features/account/AccountSkeleton.jsx';

import { PageSkeleton } from '../components/ui/PageSkeleton.jsx';
import { AdminSkeleton } from '../features/admin/AdminSkeletons.jsx';
import { DiscoverSkeleton } from '../features/circles/DiscoverSkeletons.jsx';
import { CircleSkeleton } from '../features/circles/CircleSkeletons.jsx';
import { ApplySkeleton } from '../features/applications/ApplySkeletons.jsx';
import { ApplicationSkeleton } from '../features/applications/ApplicationSkeletons.jsx';
import { FormPageSkeleton, ManageSkeleton } from '../features/manage/ManageSkeletons.jsx';
import { SessionSkeleton } from '../features/sessions/SessionSkeletons.jsx';
import { NotificationsSkeleton } from '../features/notifications/NotificationsSkeleton.jsx';

/**
 * Signed-in and secondary pages are separate chunks, loaded on first visit.
 * While a chunk downloads, the page's own skeleton is shown (ADR-25), the same
 * one RequireAuth shows while the session is restored.
 */
function lazyPage(load, name, Skeleton = PageSkeleton) {
  const Component = lazy(() => load().then((module) => ({ default: module[name] })));
  return function LazyPage(props) {
    return (
      <Suspense fallback={<Skeleton />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

const AccountPage = lazyPage(() => import('../features/account/AccountPage.jsx'), 'AccountPage', AccountSkeleton);
const AdminPage = lazyPage(() => import('../features/admin/AdminPage.jsx'), 'AdminPage', AdminSkeleton);
const DiscoverPage = lazyPage(() => import('../features/circles/DiscoverPage.jsx'), 'DiscoverPage', DiscoverSkeleton);
const CirclePage = lazyPage(() => import('../features/circles/CirclePage.jsx'), 'CirclePage', CircleSkeleton);
const SessionPage = lazyPage(() => import('../features/sessions/SessionPage.jsx'), 'SessionPage', SessionSkeleton);
const ApplyPage = lazyPage(() => import('../features/applications/ApplyPage.jsx'), 'ApplyPage', ApplySkeleton);
const ApplicationPage = lazyPage(() => import('../features/applications/ApplicationPage.jsx'), 'ApplicationPage', ApplicationSkeleton);
const managePages = () => import('../features/manage/ManagePages.jsx');
const ManageHub = lazyPage(managePages, 'ManageHub', ManageSkeleton);
const InstitutionPage = lazyPage(managePages, 'InstitutionPage', ManageSkeleton);
const MainCirclePage = lazyPage(managePages, 'MainCirclePage', ManageSkeleton);
const NewInstitutionPage = lazyPage(managePages, 'NewInstitutionPage', FormPageSkeleton);
const wizardPages = () => import('../features/manage/CircleWizard.jsx');
const NewMainCirclePage = lazyPage(wizardPages, 'NewMainCirclePage', FormPageSkeleton);
const NewCirclePage = lazyPage(wizardPages, 'NewCirclePage', FormPageSkeleton);
const NotificationsPage = lazyPage(() => import('../features/notifications/NotificationsPage.jsx'), 'NotificationsPage', NotificationsSkeleton);
const LegalPage = lazyPage(() => import('../features/legal/LegalPage.jsx'), 'LegalPage');

export const routes = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'account', element: <AccountPage />, handle: { skeleton: AccountSkeleton } },
          { path: 'admin', element: <AdminPage />, handle: { skeleton: AdminSkeleton } },
          { path: 'circles', element: <DiscoverPage />, handle: { skeleton: DiscoverSkeleton } },
          { path: 'circles/:circleId', element: <CirclePage />, handle: { skeleton: CircleSkeleton } },
          { path: 'notifications', element: <NotificationsPage />, handle: { skeleton: NotificationsSkeleton } },
          { path: 'sessions/:sessionId', element: <SessionPage />, handle: { skeleton: SessionSkeleton } },
          { path: 'manage', element: <ManageHub />, handle: { skeleton: ManageSkeleton } },
          { path: 'apply', element: <ApplyPage />, handle: { skeleton: ApplySkeleton } },
          { path: 'apply/:applicationId', element: <ApplicationPage />, handle: { skeleton: ApplicationSkeleton } },
          { path: 'institutions/new', element: <NewInstitutionPage />, handle: { skeleton: FormPageSkeleton } },
          { path: 'institutions/:institutionId', element: <InstitutionPage />, handle: { skeleton: ManageSkeleton } },
          { path: 'main-circles/new', element: <NewMainCirclePage />, handle: { skeleton: FormPageSkeleton } },
          { path: 'main-circles/:mainCircleId/circles/new', element: <NewCirclePage />, handle: { skeleton: FormPageSkeleton } },
          { path: 'main-circles/:mainCircleId', element: <MainCirclePage />, handle: { skeleton: ManageSkeleton } },
        ],
      },
      { path: 'privacy', element: <LegalPage document="privacy" /> },
      { path: 'terms', element: <LegalPage document="terms" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'sign-in', element: <SignInPage /> },
      { path: 'sign-up', element: <SignUpPage /> },
      { path: 'check-email', element: <CheckEmailPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'complete-profile', element: <CompleteProfilePage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
    ],
  },
];
