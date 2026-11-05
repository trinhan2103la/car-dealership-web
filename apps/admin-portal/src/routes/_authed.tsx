import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { ApiError } from '@/lib/api';
import { meQueryOptions } from '@/lib/auth';
import { ensureAccessToken } from '@/lib/auth-client';

/**
 * Layout route bảo vệ. Vào lần đầu / sau F5: chưa có access token trong bộ nhớ → refresh bằng cookie.
 * Không lấy được token, hoặc /me trả 401 (phiên bị thu hồi) → /login?returnTo=<đường dẫn hiện tại>.
 */
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => {
    const toLogin = () =>
      redirect({ to: '/login', search: { returnTo: location.href } });

    if (!(await ensureAccessToken())) throw toLogin();
    try {
      const me = await context.queryClient.ensureQueryData(meQueryOptions);
      return { me };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw toLogin();
      throw error;
    }
  },
  component: () => <Outlet />,
});
