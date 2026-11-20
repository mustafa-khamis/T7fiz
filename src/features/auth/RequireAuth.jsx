import { Navigate, Outlet, useLocation, useMatches } from 'react-router';
import { PageSkeleton } from '../../components/ui/PageSkeleton.jsx';
import { useAuth } from './AuthProvider.jsx';
import { useMe } from '../account/MeProvider.jsx';

/**
 * Route guard for signed-in areas. Accounts without a gender (Google sign-up)
 * must complete their profile first. The API enforces access independently.
 */
export function RequireAuth() {
  const auth = useAuth();
  const { status, me } = useMe();
  const location = useLocation();
  const matches = useMatches();
  const next = `${location.pathname}${location.search}`;

  // While the session is restored, show the destination page's own skeleton
  // (declared on its route as handle.skeleton), not a generic message.
  if (auth.status === 'loading') {
    const Skeleton = [...matches].reverse().find((match) => match.handle?.skeleton)?.handle.skeleton ?? PageSkeleton;
    return <Skeleton />;
  }
  if (auth.status !== 'signedIn') {
    return <Navigate to={`/sign-in?next=${encodeURIComponent(next)}`} replace />;
  }
  if (status === 'ready' && !me.profileComplete) {
    return <Navigate to={`/complete-profile?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}
