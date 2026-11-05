import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './api';
import {
  AUTH_CHANNEL,
  __resetAuthClientForTests,
  ensureAccessToken,
  installVisibilityRefresh,
  login,
  logout,
  onLoggedOut,
  refreshAccessToken,
} from './auth-client';
import { tokenStore } from './token-store';

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const tokenBody = (accessToken: string, expiresIn = 600) => ({
  accessToken,
  tokenType: 'Bearer',
  expiresIn,
  user: { userId: 'u', email: 'a@b.c', roles: [], permissions: [] },
});

const fetchMock = vi.fn();
const urls = () => fetchMock.mock.calls.map((c) => c[0]);
const authHeader = (i: number) => new Headers(fetchMock.mock.calls[i][1]?.headers).get('Authorization');

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  __resetAuthClientForTests();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('auth-client', () => {
  it('login lưu access token trong bộ nhớ, KHÔNG localStorage/sessionStorage', async () => {
    fetchMock.mockResolvedValueOnce(json(200, tokenBody('at-1')));

    await login('a@b.c', 'pw');

    expect(tokenStore.get()?.accessToken).toBe('at-1');
    expect(tokenStore.isFresh(9 * 60_000)).toBe(true);
    expect(JSON.stringify({ ...localStorage })).not.toContain('at-1');
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('at-1');
  });

  it('single-flight: nhiều lời gọi refresh đồng thời chỉ tạo MỘT request /refresh', async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)));

    const calls = [refreshAccessToken(), refreshAccessToken(), refreshAccessToken()];
    resolve(json(200, tokenBody('at-2')));
    const results = await Promise.all(calls);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(urls()).toEqual(['/api/admin/auth/refresh']);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    results.forEach((r) => expect(r?.accessToken).toBe('at-2'));
  });

  it('apiFetch gặp 401 TokenExpired → refresh một lần rồi gửi lại với token mới', async () => {
    tokenStore.set('old', 600);
    fetchMock
      .mockResolvedValueOnce(json(401, { title: 'x', status: 401, code: 'TokenExpired' }))
      .mockResolvedValueOnce(json(200, tokenBody('new')))
      .mockResolvedValueOnce(json(200, { ok: true }));

    await expect(apiFetch('/api/admin/thing')).resolves.toEqual({ ok: true });

    expect(urls()).toEqual(['/api/admin/thing', '/api/admin/auth/refresh', '/api/admin/thing']);
    expect(authHeader(0)).toBe('Bearer old');
    expect(authHeader(2)).toBe('Bearer new');
  });

  it('hai request cùng gặp TokenExpired chỉ refresh một lần', async () => {
    tokenStore.set('old', 600);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === '/api/admin/auth/refresh') return json(200, tokenBody('new'));
      const auth = new Headers(init?.headers).get('Authorization');
      return auth === 'Bearer new' ? json(200, { url }) : json(401, { title: 'x', status: 401, code: 'TokenExpired' });
    });

    await Promise.all([apiFetch('/a'), apiFetch('/b')]);

    expect(urls().filter((u) => u === '/api/admin/auth/refresh')).toHaveLength(1);
  });

  it('401 Unauthenticated (phiên bị thu hồi): xóa token, ném lỗi, KHÔNG refresh', async () => {
    tokenStore.set('t', 600);
    fetchMock.mockResolvedValueOnce(json(401, { title: 'x', status: 401, code: 'Unauthenticated' }));

    await expect(apiFetch('/a')).rejects.toBeInstanceOf(ApiError);

    expect(urls()).toEqual(['/a']);
    expect(tokenStore.get()).toBeNull();
  });

  it('refresh bị từ chối (401): trả null và xóa token → app về /login', async () => {
    tokenStore.set('t', 30);
    fetchMock.mockResolvedValueOnce(json(401, { title: 'x', status: 401 }));

    await expect(ensureAccessToken()).resolves.toBe(false);
    expect(tokenStore.get()).toBeNull();
  });

  it('refresh lỗi 5xx / mạng: ném ApiError và GIỮ token (không đăng xuất oan khi BFF chập chờn)', async () => {
    tokenStore.set('t', 30);
    fetchMock.mockResolvedValueOnce(json(503, { title: 'Dịch vụ tạm thời không khả dụng', status: 503 }));
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(ApiError);

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(refreshAccessToken()).rejects.toMatchObject({ status: 0 });

    expect(tokenStore.get()?.accessToken).toBe('t');
  });

  it('ensureAccessToken: token còn hạn > 60 s thì không gọi mạng; sắp hết thì refresh', async () => {
    tokenStore.set('t', 600);
    await expect(ensureAccessToken()).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    tokenStore.set('t', 30);
    fetchMock.mockResolvedValueOnce(json(200, tokenBody('t2')));
    await expect(ensureAccessToken()).resolves.toBe(true);
    expect(tokenStore.get()?.accessToken).toBe('t2');
  });

  it('tự refresh trước khi hết hạn 60 s', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(json(200, tokenBody('t1', 600))).mockResolvedValueOnce(json(200, tokenBody('t2')));
    await login('a@b.c', 'pw');

    await vi.advanceTimersByTimeAsync(539_000);
    expect(urls()).toEqual(['/api/admin/auth/login']);

    await vi.advanceTimersByTimeAsync(2_000);   // tới mốc 540 s = 600 − 60
    expect(urls()).toEqual(['/api/admin/auth/login', '/api/admin/auth/refresh']);
    expect(tokenStore.get()?.accessToken).toBe('t2');
  });

  it('quay lại tab khi token sắp hết hạn → refresh ngay', async () => {
    const doc = { visibilityState: 'hidden', listeners: [] as (() => void)[] } as unknown as Document & {
      listeners: (() => void)[];
    };
    (doc as unknown as { addEventListener: unknown }).addEventListener = (_: string, h: () => void) => doc.listeners.push(h);
    (doc as unknown as { removeEventListener: unknown }).removeEventListener = () => undefined;
    installVisibilityRefresh(doc);
    tokenStore.set('t', 30);
    fetchMock.mockResolvedValueOnce(json(200, tokenBody('t2')));

    (doc as unknown as { visibilityState: string }).visibilityState = 'visible';
    doc.listeners.forEach((h) => h());
    await vi.waitFor(() => expect(tokenStore.get()?.accessToken).toBe('t2'));
  });

  it('nhiều tab: token do tab khác refresh được nhận qua BroadcastChannel', async () => {
    await refreshAccessToken().catch(() => undefined);   // mở channel của "tab này"
    fetchMock.mockReset();
    const otherTab = new BroadcastChannel(AUTH_CHANNEL);

    otherTab.postMessage({ type: 'token', accessToken: 'from-other-tab', expiresAt: Date.now() + 600_000 });

    await vi.waitFor(() => expect(tokenStore.get()?.accessToken).toBe('from-other-tab'));
    otherTab.close();
  });

  it('logout: gọi BFF, xóa token, báo tab khác; tab khác nhận "logout" thì xóa token và gọi listener', async () => {
    const otherTab = new BroadcastChannel(AUTH_CHANNEL);
    const received: unknown[] = [];
    otherTab.onmessage = (e) => received.push(e.data);
    tokenStore.set('t', 600);
    fetchMock.mockResolvedValueOnce(json(204));

    await logout();

    expect(urls()).toEqual(['/api/admin/auth/logout']);
    expect(tokenStore.get()).toBeNull();
    await vi.waitFor(() => expect(received).toContainEqual({ type: 'logout' }));

    const loggedOut = vi.fn();
    onLoggedOut(loggedOut);
    tokenStore.set('t', 600);
    otherTab.postMessage({ type: 'logout' });
    await vi.waitFor(() => expect(loggedOut).toHaveBeenCalled());
    expect(tokenStore.get()).toBeNull();
    otherTab.close();
  });

  it('logout vẫn xóa token cục bộ khi BFF lỗi', async () => {
    tokenStore.set('t', 600);
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(logout()).rejects.toBeDefined();
    expect(tokenStore.get()).toBeNull();
  });
});
