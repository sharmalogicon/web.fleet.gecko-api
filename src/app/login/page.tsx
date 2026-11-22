'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, Truck, User } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ApiError, fallbackFor } from '@/lib/api/problem';
import { errorText } from '@/lib/api/errorText';
import { useT } from '@/i18n/I18nContext';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { OfflineNotice } from '@/components/auth/AccessScreens';

// Sign-in is against the Platform API (POST /auth/login): e-mail or user name + password.
// Company and branches come from the user's account, so nothing else is sent.

export default function LoginPage() {
  const { login, isAuthenticated, status } = useAuth();
  const { t } = useT();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  // Local development only (.env.local): a production build folds these to '' and drops the values.
  const [username, setUsername] = useState(
    process.env.NODE_ENV === 'development' ? (process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? '') : '');
  const [password, setPassword] = useState(
    process.env.NODE_ENV === 'development' ? (process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? '') : '');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!username.trim()) next.username = t('auth.usernameRequired');
    // No length rule: a password set under an older rule must still sign in.
    if (!password) next.password = t('auth.passwordRequired');
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await login({ username, password });
    } catch (err) {
      let general: string;
      if (err instanceof ApiError && err.code === 'password_change_required') general = t('auth.passwordChangeRequired');
      // Wrong password without a server message: "session ended" would be the wrong words here.
      else if (err instanceof ApiError && (err.status === 400 || err.status === 401) && err.message === fallbackFor(err.status))
        general = t('auth.failed');
      else general = errorText(err, t);
      setErrors({ general });
      setSubmitting(false);
    }
  };

  const inputClass = (invalid: boolean) =>
    `w-full h-11 pl-10 pr-10 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
      invalid ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-primary-700 text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center">
            <Truck size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold">{t('auth.brand')}</div>
            <div className="text-sm opacity-80">{t('auth.brandTagline')}</div>
          </div>
        </div>
        <p className="text-sm opacity-70">GECKO</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex justify-end mb-8">
            <LanguageToggle />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{t('auth.title')}</h1>
          <p className="mt-1 mb-6 text-sm text-gray-500">{t('auth.subtitle')}</p>

          {status === 'offline' && (
            <div className="mb-4">
              <OfflineNotice compact />
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {errors.general && (
              <div role="alert" className="flex gap-2 items-start p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errors.general}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.username')}</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  className={inputClass(!!errors.username)}
                  placeholder={t('auth.usernamePlaceholder')}
                  value={username}
                  aria-invalid={!!errors.username}
                  onChange={(e) => { setUsername(e.target.value); setErrors((s) => ({ ...s, username: undefined })); }}
                />
              </div>
              {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={inputClass(!!errors.password)}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  aria-invalid={!!errors.password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((s) => ({ ...s, password: undefined })); }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 h-11 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
            >
              {submitting ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <p className="mt-6 p-3 rounded-lg border border-dashed border-gray-300 bg-white text-xs text-gray-500">
            {t('auth.hint')}
          </p>
        </div>
      </div>
    </div>
  );
}
