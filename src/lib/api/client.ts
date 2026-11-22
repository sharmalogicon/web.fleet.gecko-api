import { ApiError, offlineError, toApiError } from './problem';

/**
 * THE ONLY PLACE THAT TALKS TO THE APIs (ported from web.trucking.gecko-api).
 *
 * - The access token lives in a JS variable for its ~15 minutes, never in localStorage.
 * - The refresh token is an HttpOnly cookie on /auth that this code never sees; the
 *   browser sends it to /auth/refresh by itself, so a page reload restores the session.
 * - Calls are same-origin: next.config.ts forwards /auth and /api to the Platform API
 *   and /api/fleet to the Fleet API.
 */

export interface AccessToken {
  token: string;
  expiresAt: number; // epoch ms
}

/** GET /auth/me. `firstName` holds the WHOLE name; `lastName` is always null. */
export interface Me {
  userId: string;
  tenantId: string;
  userType: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  userName?: string | null;
  branches: string[];
  modules: string[];
  roles: string[];
  permissions: string[];
  /** Permissions held only at named branches, as "p1,p2@branchId,branchId". */
  branchPermissions: string[];
}

let accessToken: AccessToken | null = null;
let refreshInFlight: Promise<AccessToken | null> | null = null;

/** Refresh a little early so a request never leaves with a token that expires mid-flight. */
const EXPIRY_SKEW_MS = 30_000;

function isUsable(token: AccessToken | null): token is AccessToken {
  return token !== null && token.expiresAt - EXPIRY_SKEW_MS > Date.now();
}

function store(payload: { accessToken: string; expiresAt: string }): AccessToken {
  accessToken = { token: payload.accessToken, expiresAt: new Date(payload.expiresAt).getTime() };
  return accessToken;
}

export function hasToken(): boolean {
  return accessToken !== null;
}

/**
 * The branch picked in the header switcher, sent as `X-Branch-Id` on every call so the API can check branch-scoped
 * permissions (e.g. `revenue.tariff.*`, owner decision 12 Q3) at that branch. Set by `useBranchContext`; null = none.
 */
let currentBranchId: string | null = null;
export function setRequestBranch(branchId: string | null) {
  currentBranchId = branchId;
}
export const requestBranch = () => currentBranchId;

async function send(path: string, init: RequestInit, token?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (currentBranchId && !headers.has('X-Branch-Id')) headers.set('X-Branch-Id', currentBranchId);
  // A file upload (FormData) keeps the browser's multipart Content-Type with its boundary.
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body !== undefined && !isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  return fetch(path, { ...init, headers, credentials: 'same-origin' });
}

async function reach(path: string, init: RequestInit, token?: string): Promise<Response> {
  try {
    return await send(path, init, token);
  } catch {
    throw offlineError();
  }
}

/**
 * Swaps the refresh cookie for a new access token; null = not signed in.
 * Throws an ApiError(0) when the API is not running (that is not "signed out").
 * Concurrent callers share one request, so one page never burns two rotations.
 */
export function refresh(): Promise<AccessToken | null> {
  refreshInFlight ??= (async () => {
    try {
      const response = await reach('/auth/refresh', { method: 'POST' });
      // 5xx from the proxy = the Platform API is down, not "signed out".
      if (response.status >= 500) throw offlineError();
      if (!response.ok) {
        accessToken = null;
        return null;
      }
      return store(await response.json());
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function tokenForRequest(): Promise<string | null> {
  if (isUsable(accessToken)) return accessToken.token;
  const renewed = await refresh();
  return renewed?.token ?? null;
}

/** Sends with the bearer token, refreshing once on 401; throws an ApiError for any failure. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await tokenForRequest();
  let response = await reach(path, init, token ?? undefined);

  if (response.status === 401 && token) {
    const renewed = await refresh();
    if (renewed) response = await reach(path, init, renewed.token);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiGet = <T>(path: string) => api<T>(path);

/** A file answer (PDF, Excel): the blob and the file name from Content-Disposition. */
export async function apiFile(path: string, init: RequestInit = {}): Promise<{ blob: Blob; fileName: string | null }> {
  const token = await tokenForRequest();
  const headers = { Accept: '*/*', ...(init.headers as Record<string, string> | undefined) };
  let response = await reach(path, { ...init, headers }, token ?? undefined);
  if (response.status === 401 && token) {
    const renewed = await refresh();
    if (renewed) response = await reach(path, { ...init, headers }, renewed.token);
  }
  if (!response.ok) throw await toApiError(response);
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return { blob: await response.blob(), fileName: match ? decodeURIComponent(match[1]) : null };
}

/** Opens a downloaded file in a new tab (PDF) or saves it (anything else). */
export function openFile({ blob, fileName }: { blob: Blob; fileName: string | null }, save = false) {
  const url = URL.createObjectURL(blob);
  if (!save && blob.type.includes('pdf')) {
    window.open(url, '_blank', 'noopener');
  } else {
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName ?? 'download' });
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
/** A multipart upload (FormData): same token / 401 / problem handling; the browser sets the boundary. */
export const apiUpload = <T>(path: string, form: FormData) => api<T>(path, { method: 'POST', body: form });

export const apiSend = <T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) =>
  api<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

/** `?a=1&b=x`, skipping empty values. */
export function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** POST /auth/login. `email` also takes a user name (e.g. "PLA"). Sets the refresh cookie. */
export async function login(email: string, password: string): Promise<AccessToken> {
  const response = await reach('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!response.ok) throw await toApiError(response);
  return store(await response.json());
}

/** Ends the session server-side and clears the cookie; the local token goes either way. */
export async function logout(): Promise<void> {
  try {
    await send('/auth/logout', { method: 'POST' });
  } catch {
    // Offline: forget the token locally anyway.
  } finally {
    accessToken = null;
    currentBranchId = null;
  }
}

export const me = () => apiGet<Me>('/auth/me');

export { ApiError };
