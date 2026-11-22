'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useFleetAccess } from '@/lib/api/fleet/access';
import { canOpen } from '@/lib/access/routeGuard';
import { ApiError } from '@/lib/api/problem';
import { errorText } from '@/lib/api/errorText';
import { useT } from '@/i18n/I18nContext';
import { FleetNotEnabled, Forbidden, FullScreenLoading, OfflineNotice } from './AccessScreens';

/**
 * Wraps the app shell: only a signed-in user of a Fleet tenant gets past it.
 * - loading → spinner; offline → banner with "Try again" (not the login page)
 * - anonymous → /login
 * - tenant without FLEET → "not enabled" page, no app
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, hasFleetModule } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  if (status === 'loading' || status === 'anonymous') return <FullScreenLoading />;
  if (status === 'offline') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-xl mx-auto mt-16">
          <OfflineNotice />
        </div>
      </div>
    );
  }
  if (!hasFleetModule) return <FleetNotEnabled />;
  return <>{children}</>;
}

/** Inside the shell: shows the page only when the route-guard map lets the user open it. */
export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useT();
  const { isLoading, error, canAnywhere, isFleetUser } = useFleetAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }
  if (error) {
    return error instanceof ApiError && error.status === 0 ? (
      <OfflineNotice />
    ) : (
      <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
        {t('access.accessError')} {errorText(error, t)}
      </div>
    );
  }
  if (!canOpen(pathname, canAnywhere, isFleetUser)) return <Forbidden noFleetAccess={!isFleetUser} />;
  return <>{children}</>;
}
