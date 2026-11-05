import { createFileRoute, redirect } from '@tanstack/react-router';
import { safeReturnTo } from '@/lib/auth';
import { tokenStore } from '@/lib/token-store';
import { LoginPage } from '@/pages/LoginPage';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }),
  // Đã có access token còn hạn thì không ở lại trang đăng nhập.
  beforeLoad: ({ search }) => {
    if (tokenStore.isFresh()) {
      throw redirect({ to: safeReturnTo(search.returnTo) });
    }
  },
  component: LoginRoute,
});

function LoginRoute() {
  const { returnTo } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <LoginPage
      onSuccess={() => navigate({ to: safeReturnTo(returnTo), replace: true })}
    />
  );
}
