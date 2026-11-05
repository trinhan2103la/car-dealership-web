import { Button } from '@car-dealership/ui/components/button';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { logout, meQueryKey, meQueryOptions } from '@/lib/auth';

export function HomePage() {
  const { data } = useSuspenseQuery(meQueryOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: logout,
    // logout() luôn xóa access token cục bộ và báo các tab khác, kể cả khi BFF lỗi → luôn về /login.
    onSettled: (_data, err) => {
      queryClient.removeQueries({ queryKey: meQueryKey });
      if (err && !(err instanceof ApiError && err.status === 401)) {
        setError(
          err instanceof ApiError ? err.problem.title : 'Đăng xuất thất bại.',
        );
      }
      void navigate({ to: '/login', replace: true });
    },
  });

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Xin chào {data.user.email}</h1>
        <Button
          variant="outline"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </Button>
      </header>
      <div role="alert" aria-live="polite" className="text-sm text-destructive">
        {error}
      </div>
      <section
        aria-labelledby="perm-heading"
        className="text-sm text-muted-foreground"
      >
        <h2 id="perm-heading" className="mb-2 font-medium text-foreground">
          Quyền của bạn
        </h2>
        {data.user.permissions.length === 0 ? (
          <p>Chưa có quyền nào.</p>
        ) : (
          <ul className="list-inside list-disc">
            {data.user.permissions.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
