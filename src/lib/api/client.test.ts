import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The client keeps the token in module state: load a fresh copy for every test.
async function loadClient() {
  vi.resetModules();
  return import('./client');
}

const tokenBody = (token: string) => ({
  accessToken: token,
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('refresh()', () => {
  it('shares one /auth/refresh request between concurrent callers (single flight)', async () => {
    const client = await loadClient();
    let release!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { release = resolve; }));

    const a = client.refresh();
    const b = client.refresh();
    const c = client.refresh();
    release(json(200, tokenBody('T1')));

    const [ta, tb, tc] = await Promise.all([a, b, c]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/auth/refresh');
    expect(ta?.token).toBe('T1');
    expect(tb).toBe(ta);
    expect(tc).toBe(ta);
  });

  it('starts a new request once the previous one finished', async () => {
    const client = await loadClient();
    fetchMock.mockResolvedValueOnce(json(200, tokenBody('T1'))).mockResolvedValueOnce(json(200, tokenBody('T2')));
    await client.refresh();
    const second = await client.refresh();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second?.token).toBe('T2');
  });

  it('returns null when there is no session (401)', async () => {
    const client = await loadClient();
    fetchMock.mockResolvedValueOnce(json(401, {}));
    await expect(client.refresh()).resolves.toBeNull();
  });

  it('throws an offline ApiError (status 0) when the API is down, not "signed out"', async () => {
    const client = await loadClient();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(client.refresh()).rejects.toMatchObject({ status: 0 });

    fetchMock.mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }));
    await expect(client.refresh()).rejects.toMatchObject({ status: 0 });
  });
});

describe('api()', () => {
  it('on 401 refreshes once and retries with the new token', async () => {
    const client = await loadClient();
    fetchMock
      .mockResolvedValueOnce(json(200, tokenBody('OLD'))) // login
      .mockResolvedValueOnce(json(401, { title: 'Unauthorized' })) // first call: token revoked
      .mockResolvedValueOnce(json(200, tokenBody('NEW'))) // /auth/refresh
      .mockResolvedValueOnce(json(200, { permissions: [] })); // retry

    await client.login('admin@sct-test.example', 'pw');
    const result = await client.api<{ permissions: unknown[] }>('/api/fleet/access');

    expect(result).toEqual({ permissions: [] });
    const calls = fetchMock.mock.calls.map(([path, init]) => [path, new Headers(init.headers).get('Authorization')]);
    expect(calls).toEqual([
      ['/auth/login', null],
      ['/api/fleet/access', 'Bearer OLD'],
      ['/auth/refresh', null],
      ['/api/fleet/access', 'Bearer NEW'],
    ]);
  });

  it('throws 401 when refresh cannot fix it (no second retry)', async () => {
    const client = await loadClient();
    fetchMock
      .mockResolvedValueOnce(json(200, tokenBody('OLD')))
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(401, {})); // refresh: session gone

    await client.login('u', 'p');
    await expect(client.api('/api/fleet/access')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('refreshes first when there is no token yet (page reload)', async () => {
    const client = await loadClient();
    fetchMock.mockResolvedValueOnce(json(200, tokenBody('R'))).mockResolvedValueOnce(json(200, { ok: true }));
    await client.api('/auth/me');
    expect(fetchMock.mock.calls[0][0]).toBe('/auth/refresh');
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('Authorization')).toBe('Bearer R');
  });

  it('turns ProblemDetails into an ApiError with field errors', async () => {
    const client = await loadClient();
    fetchMock
      .mockResolvedValueOnce(json(200, tokenBody('T')))
      .mockResolvedValueOnce(json(400, { title: 'One or more validation errors occurred.', errors: { prefix: ['Letters and digits only.'] } }));
    const err = (await client.api('/api/fleet/setup/number-series', { method: 'POST' }).catch((e) => e)) as InstanceType<typeof client.ApiError>;
    expect(err).toBeInstanceOf(client.ApiError);
    expect(err.status).toBe(400);
    expect(err.forField('Prefix')).toBe('Letters and digits only.');
  });
});

describe('X-Branch-Id (owner decision 12 Q3)', () => {
  const sentHeaders = () => new Headers((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).headers)

  it('is sent with the current branch and left out when there is none', async () => {
    const client = await loadClient();
    fetchMock.mockImplementation(async (url: string) => (url === '/auth/refresh' ? json(200, tokenBody('T')) : json(200, { ok: true })));
    await client.apiGet('/api/fleet/x');
    expect(sentHeaders().has('X-Branch-Id')).toBe(false);
    client.setRequestBranch('b-123');
    await client.apiGet('/api/fleet/x');
    expect(sentHeaders().get('X-Branch-Id')).toBe('b-123');
  });

  it('is cleared on logout', async () => {
    const client = await loadClient();
    fetchMock.mockImplementation(async () => json(200, {}));
    client.setRequestBranch('b-1');
    await client.logout();
    expect(client.requestBranch()).toBeNull();
  });
});
