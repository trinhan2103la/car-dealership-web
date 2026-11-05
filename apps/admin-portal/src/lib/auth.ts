import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch } from './api';
import type { AdminUser } from './auth-client';

export type { AdminUser } from './auth-client';
export { login, logout } from './auth-client';

/** Khớp response của BFF GET /api/admin/auth/me. */
export interface MeResponse {
  user: AdminUser;
}

export const meQueryKey = ['auth', 'me'] as const;

/** staleTime 60 s. 401 không retry (chưa đăng nhập / phiên đã bị thu hồi là trạng thái hợp lệ). */
export const meQueryOptions = queryOptions({
  queryKey: meQueryKey,
  queryFn: () => apiFetch<MeResponse>('/api/admin/auth/me'),
  staleTime: 60_000,
  retry: (count, error) =>
    !(error instanceof ApiError && error.status === 401) && count < 2,
});

/**
 * Chỉ nhận path nội bộ bắt đầu bằng "/" và KHÔNG bắt đầu bằng "//" (chặn open redirect).
 * Chặn thêm "/\" vì một số trình duyệt coi "\" như "/".
 */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\')
  )
    return '/';
  if (value.startsWith('/login')) return '/';
  return value;
}
