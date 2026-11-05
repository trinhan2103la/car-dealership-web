import { Button } from '@car-dealership/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@car-dealership/ui/components/card';
import { Input } from '@car-dealership/ui/components/input';
import { Label } from '@car-dealership/ui/components/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { login, meQueryOptions } from '@/lib/auth';

type Field = 'email' | 'password';

function describe(error: unknown): {
  message: string;
  fields: Partial<Record<Field, string>>;
} {
  if (!(error instanceof ApiError))
    return { message: 'Đăng nhập thất bại, vui lòng thử lại.', fields: {} };
  const { problem } = error;
  const fields: Partial<Record<Field, string>> = {};
  for (const key of ['email', 'password'] as const) {
    const msgs = problem.errors?.[key];
    if (msgs?.length) fields[key] = msgs.join(' ');
  }
  if (error.status === 429 && error.retryAfterSeconds) {
    return {
      message: `${problem.title} (thử lại sau ${error.retryAfterSeconds} giây)`,
      fields,
    };
  }
  return { message: problem.title, fields };
}

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: async () => {
      // login() đã lưu access token trong bộ nhớ; nạp sẵn /me để trang chủ hiện ngay.
      await queryClient.fetchQuery(meQueryOptions);
      onSuccess();
    },
  });

  const { message, fields } = mutation.isError
    ? describe(mutation.error)
    : { message: '', fields: {} };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Đăng nhập quản trị</h1>
          </CardTitle>
          <CardDescription>
            Dùng tài khoản được cấp để vào Admin Portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={fields.email ? true : undefined}
                aria-describedby={fields.email ? 'email-error' : undefined}
              />
              {fields.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {fields.email}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={fields.password ? true : undefined}
                aria-describedby={
                  fields.password ? 'password-error' : undefined
                }
              />
              {fields.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {fields.password}
                </p>
              )}
            </div>
            <div
              role="alert"
              aria-live="polite"
              className="min-h-5 text-sm text-destructive"
            >
              {message}
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
