'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as client from '@/lib/api/client';
import type { Me } from '@/lib/api/client';

/**
 * Who is signed in, against the Platform API (POST /auth/login, /auth/refresh, /auth/me).
 * Ported from web.trucking.gecko-api, without its /[locale] URLs (Fleet switches language
 * in memory, see src/i18n/I18nContext.tsx).
 *
 * On mount it tries /auth/refresh once: the access token lives in memory and is gone
 * after a reload, but the HttpOnly refresh cookie is not, so a reload keeps the session.
 * `status` keeps "API not running" (offline) apart from "signed out" (anonymous).
 */

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'offline';

export type User = Me;

/** The module code a tenant must hold for this app (the token's `mod` claim). */
export const FLEET_MODULE = 'FLEET';

interface LoginCredentials {
  /** E-mail or user name. */
  username: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  loading: boolean;
  /** Throws an ApiError (status 0 = offline) when sign-in fails. */
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  /** The session ended under us (401 that refresh could not fix): forget the user, go to /login. */
  expireSession: () => void;
  /** Try again after the "offline" banner (the API may have started). */
  retry: () => void;
  /** Platform permission held tenant-wide or at any branch (e.g. revenue.tariff.view). */
  can: (permission: string) => boolean;
  /** Platform permission held tenant-wide or at this branch (branch-scoped codes such as revenue.tariff.*). */
  canAtBranch: (permission: string, branchId: string | null | undefined) => boolean;
  /** The tenant holds the Fleet module. */
  hasFleetModule: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** The name to show: the user's name, else e-mail, else user name. */
export function displayName(user: User | null): string {
  if (!user) return '';
  return user.firstName?.trim() || user.email || user.userName || '';
}

/** Two letters for the avatar, from the whole name (never split on a space: Thai names). */
export function initialsOf(user: User | null): string {
  const name = displayName(user);
  return name ? name.slice(0, 2).toUpperCase() : '—';
}

/** `permission` held tenant-wide, or at some branch ("p1,p2@branchId,branchId" in branchPermissions). */
export function holds(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (user.permissions.includes(permission)) return true;
  return user.branchPermissions.some((grant) => grant.split('@')[0].split(',').includes(permission));
}

/** `permission` held tenant-wide, or in a grant that lists `branchId` ("p1,p2@b1,b2"). No branch → any branch. */
export function holdsAt(user: User | null, permission: string, branchId: string | null | undefined): boolean {
  if (!user) return false;
  if (user.permissions.includes(permission)) return true;
  if (!branchId) return holds(user, permission);
  return user.branchPermissions.some((grant) => {
    const [perms, branches = ''] = grant.split('@');
    return perms.split(',').includes(permission) && branches.split(',').includes(branchId);
  });
}

/** A role claim as a person reads it: "FLEET_MANAGER@<branchId>" → "FLEET MANAGER". */
export const roleLabel = (claim: string) => claim.split('@')[0].replace(/_/g, ' ');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    try {
      setUser(await client.me());
      setStatus('authenticated');
    } catch (err) {
      setUser(null);
      setStatus(err instanceof client.ApiError && err.status === 0 ? 'offline' : 'anonymous');
    }
  }, []);

  // Restore the session from the refresh cookie (again after retry()).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let token: client.AccessToken | null = null;
      try {
        token = await client.refresh();
      } catch {
        if (!cancelled) setStatus('offline');
        return;
      }
      if (cancelled) return;
      if (!token) {
        setStatus('anonymous');
        return;
      }
      await loadProfile();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfile, attempt]);

  const login = useCallback(async ({ username, password }: LoginCredentials) => {
    await client.login(username.trim(), password);
    await loadProfile();
    router.replace('/dashboard');
  }, [loadProfile, router]);

  const logout = useCallback(async () => {
    await client.logout();
    setUser(null);
    setStatus('anonymous');
    router.replace('/login');
  }, [router]);

  const expireSession = useCallback(() => {
    setUser(null);
    setStatus('anonymous');
    router.replace('/login');
  }, [router]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    status,
    isAuthenticated: status === 'authenticated',
    loading: status === 'loading',
    login,
    logout,
    expireSession,
    retry,
    can: (permission: string) => holds(user, permission),
    canAtBranch: (permission: string, branchId: string | null | undefined) => holdsAt(user, permission, branchId),
    hasFleetModule: !!user?.modules.includes(FLEET_MODULE),
  }), [user, status, login, logout, expireSession, retry]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
