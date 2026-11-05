import { networkError, toApiError } from './api-error';
import { tokenStore, type StoredToken } from './token-store';

/**
 * Vòng đời access token ở Admin_Portal.
 * - login / logout / refresh gọi BFF; refresh token là cookie HttpOnly, JS không bao giờ thấy.
 * - Single-flight: mọi lời gọi refresh đồng thời trong MỘT tab dùng chung một Promise.
 * - Nhiều tab: Web Locks (`cdp-refresh`) để mỗi lúc chỉ một tab gọi /refresh; tab khác nhận token qua BroadcastChannel
 *   (`cdp-auth`). Server còn grace 20 s làm lưới an toàn khi trình duyệt không có Web Locks.
 * - Làm mới chủ động: trước khi hết hạn 60 s, và ngay khi tab hiện lại (mở khóa màn hình, quay lại tab) — timer bị trình
 *   duyệt làm chậm khi tab ẩn nên không tin một mình timer.
 */
export interface AdminUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AdminUser;
}

export const REFRESH_MARGIN_MS = 60_000;
export const AUTH_CHANNEL = 'cdp-auth';
export const REFRESH_LOCK = 'cdp-refresh';

type AuthMessage =
  | { type: 'token'; accessToken: string; expiresAt: number }
  | { type: 'logout' };

let inflight: Promise<StoredToken | null> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let channel: BroadcastChannel | null = null;
const logoutListeners = new Set<() => void>();

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  channel = new BroadcastChannel(AUTH_CHANNEL);
  channel.onmessage = (event: MessageEvent<AuthMessage>) => {
    const message = event.data;
    if (message?.type === 'token') {
      // Token do tab khác vừa refresh: dùng luôn, khỏi gọi /refresh.
      tokenStore.set(
        message.accessToken,
        (message.expiresAt - Date.now()) / 1000,
      );
      schedule();
    } else if (message?.type === 'logout') {
      clearLocal();
      logoutListeners.forEach((l) => l());
    }
  };
  return channel;
}

function post(message: AuthMessage) {
  getChannel()?.postMessage(message);
}

function clearLocal() {
  clearTimeout(timer);
  timer = undefined;
  tokenStore.clear();
}

function accept(response: TokenResponse): StoredToken {
  const stored = tokenStore.set(response.accessToken, response.expiresIn);
  post({
    type: 'token',
    accessToken: stored.accessToken,
    expiresAt: stored.expiresAt,
  });
  schedule();
  return stored;
}

/** Hẹn refresh trước khi hết hạn REFRESH_MARGIN_MS. */
function schedule() {
  clearTimeout(timer);
  const token = tokenStore.get();
  if (!token) return;
  const delay = Math.max(0, token.expiresAt - Date.now() - REFRESH_MARGIN_MS);
  timer = setTimeout(
    () => void refreshAccessToken().catch(() => undefined),
    delay,
  );
}

async function callRefresh(): Promise<TokenResponse | null> {
  let response: Response;
  try {
    response = await fetch('/api/admin/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json, application/problem+json' },
    });
  } catch {
    throw networkError();
  }
  if (response.status === 401) return null;
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as TokenResponse;
}

async function refreshUnderLock(
  rejectedToken?: string,
): Promise<StoredToken | null> {
  const run = async (): Promise<StoredToken | null> => {
    // Trong lúc chờ khóa, tab khác có thể đã refresh và gửi token qua BroadcastChannel. Chỉ dùng lại token hiện có khi
    // nó KHÔNG phải token server vừa từ chối (server nói hết hạn thì tin server, kể cả khi đồng hồ máy nói còn hạn).
    const current = tokenStore.get();
    if (
      current &&
      current.accessToken !== rejectedToken &&
      tokenStore.isFresh(REFRESH_MARGIN_MS)
    )
      return current;
    const result = await callRefresh();
    if (!result) {
      clearLocal();
      return null;
    }
    return accept(result);
  };
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? locks.request(REFRESH_LOCK, run) : run();
}

/**
 * Lấy access token mới bằng cookie refresh. Null = phiên đã hết (hết hạn, bị thu hồi, đăng xuất ở tab khác) → /login.
 * Ném ApiError nếu lỗi mạng / 5xx (giữ nguyên trạng thái, không đăng xuất oan khi BFF chập chờn).
 */
export function refreshAccessToken(
  rejectedToken?: string,
): Promise<StoredToken | null> {
  getChannel();
  inflight ??= refreshUnderLock(rejectedToken).finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Đảm bảo có access token còn hạn (vào route cần đăng nhập, kể cả sau F5). False = cần đăng nhập. */
export async function ensureAccessToken(): Promise<boolean> {
  if (tokenStore.isFresh(REFRESH_MARGIN_MS)) return true;
  return (await refreshAccessToken()) !== null;
}

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  getChannel();
  let response: Response;
  try {
    response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, application/problem+json',
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw networkError();
  }
  if (!response.ok) throw await toApiError(response);
  const result = (await response.json()) as TokenResponse;
  accept(result);
  return result;
}

/** Đăng xuất ở mọi tab. Luôn xóa token cục bộ, kể cả khi BFF lỗi. */
export async function logout(): Promise<void> {
  try {
    const response = await fetch('/api/admin/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (!response.ok && response.status !== 401)
      throw await toApiError(response);
  } finally {
    clearLocal();
    post({ type: 'logout' });
  }
}

/** Đăng ký nhận sự kiện "đã đăng xuất" do tab khác. */
export function onLoggedOut(listener: () => void): () => void {
  getChannel();
  logoutListeners.add(listener);
  return () => logoutListeners.delete(listener);
}

/** Quay lại tab / mở khóa màn hình: timer có thể đã bị trễ, kiểm và refresh ngay nếu cần. */
export function installVisibilityRefresh(doc: Document = document): () => void {
  const handler = () => {
    if (
      doc.visibilityState === 'visible' &&
      tokenStore.get() &&
      !tokenStore.isFresh(REFRESH_MARGIN_MS)
    ) {
      void refreshAccessToken().catch(() => undefined);
    }
  };
  doc.addEventListener('visibilitychange', handler);
  return () => doc.removeEventListener('visibilitychange', handler);
}

/** Chỉ cho test: đưa module về trạng thái ban đầu. */
export function __resetAuthClientForTests(): void {
  clearLocal();
  inflight = null;
  channel?.close();
  channel = null;
  logoutListeners.clear();
}
