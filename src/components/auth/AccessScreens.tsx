'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Ban, Loader2, LogOut, ShieldAlert, WifiOff } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useT } from '@/i18n/I18nContext';

/** "API not running" — never a login loop. */
export function OfflineNotice({ compact = false }: { compact?: boolean }) {
  const { retry } = useAuth();
  const { t } = useT();
  return (
    <div role="alert" className={`flex gap-3 items-start rounded-lg border border-amber-300 bg-amber-50 text-amber-900 ${compact ? 'p-3 text-sm' : 'p-4'}`}>
      <WifiOff size={compact ? 16 : 20} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">{t('access.offlineTitle')}</p>
        <p className="mt-0.5 text-sm">{t('access.offlineBody')}</p>
        {process.env.NODE_ENV === 'development' && <p className="mt-1 text-xs opacity-80">{t('access.offlineDev')}</p>}
      </div>
      <button
        type="button"
        onClick={retry}
        className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-md bg-white border border-amber-300 hover:bg-amber-100"
      >
        {t('access.retry')}
      </button>
    </div>
  );
}

export function FullScreenLoading() {
  const { t } = useT();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm gap-2">
      <Loader2 size={18} className="animate-spin" />
      {t('auth.checking')}
    </div>
  );
}

function MessagePanel({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">{icon}</div>
      <h1 className="mt-4 text-xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">{body}</p>
      {children && <div className="mt-6 flex justify-center gap-2">{children}</div>}
    </div>
  );
}

/** The tenant does not hold the FLEET module: the app is not shown at all. */
export function FleetNotEnabled() {
  const { logout } = useAuth();
  const { t } = useT();
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <MessagePanel icon={<Ban size={22} />} title={t('access.notEnabledTitle')} body={t('access.notEnabledBody')}>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <LogOut size={16} />
          {t('auth.signOut')}
        </button>
      </MessagePanel>
    </div>
  );
}

/** 403 for a page the route guard closes (the API would refuse its data anyway). */
export function Forbidden({ noFleetAccess = false }: { noFleetAccess?: boolean }) {
  const { t } = useT();
  return (
    <MessagePanel
      icon={<ShieldAlert size={22} />}
      title={t('access.forbiddenTitle')}
      body={noFleetAccess ? t('access.noFleetAccess') : t('access.forbiddenBody')}
    >
      <Link href="/dashboard" className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700">
        {t('access.backToDashboard')}
      </Link>
    </MessagePanel>
  );
}
