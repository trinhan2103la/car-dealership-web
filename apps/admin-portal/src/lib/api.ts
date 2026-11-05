import { networkError, readJson, toApiError } from './api-error';
import { refreshAccessToken } from './auth-client';
import { tokenStore } from './token-store';

export { ApiError, type ProblemDetails } from './api-error';

/**
 * Gọi BFF cùng origin (/api/*). Mọi lỗi được đổi thành ApiError mang ProblemDetails (RFC 9457) của BFF.
 * Gắn `Authorization: Bearer <access token>` khi có. Gặp 401 `TokenExpired` → refresh MỘT lần (single-flight,
 * dùng chung giữa các request) rồi gửi lại; refresh thất bại → ApiError 401 (route sẽ chuyển về /login).
 */
export interface ApiFetchOptions extends RequestInit {
  /** Mặc định true: gắn access token. */
  auth?: boolean;
}

async function send(path: string, init: ApiFetchOptions): Promise<Response> {
  const { auth = true, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set('Accept', 'application/json, application/problem+json');
  if (rest.body !== undefined && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const token = auth ? tokenStore.get() : null;
  if (token) headers.set('Authorization', `Bearer ${token.accessToken}`);

  try {
    return await fetch(path, {
      ...rest,
      method: (rest.method ?? 'GET').toUpperCase(),
      headers,
      credentials: 'same-origin',
    });
  } catch {
    throw networkError();
  }
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchOptions = {},
): Promise<T> {
  const sentToken =
    init.auth === false ? undefined : tokenStore.get()?.accessToken;
  let response = await send(path, init);

  if (response.status === 401 && init.auth !== false) {
    const error = await toApiError(response);
    if (error.problem.code !== 'TokenExpired') {
      tokenStore.clear();
      throw error;
    }
    // Access token hết hạn: refresh (dùng chung với request khác đang chờ) rồi thử lại đúng một lần.
    // Truyền token vừa bị từ chối để không "dùng lại" chính nó khi đồng hồ máy lệch so với server.
    if (!(await refreshAccessToken(sentToken))) throw error;
    response = await send(path, init);
  }

  if (response.status === 204) return undefined as T;
  if (!response.ok) throw await toApiError(response);
  return (await readJson(response)) as T;
}
