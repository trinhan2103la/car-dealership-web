import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeReturnTo } from '@/lib/auth';
import { __resetAuthClientForTests } from '@/lib/auth-client';
import { LoginPage } from './LoginPage';

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json', ...headers },
  });
}

function setup() {
  const onSuccess = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LoginPage onSuccess={onSuccess} />
    </QueryClientProvider>,
  );
  return { onSuccess, user: userEvent.setup() };
}

async function fill(user: ReturnType<typeof userEvent.setup>, email = 'admin@example.com', password = 'secret') {
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Mật khẩu'), password);
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  __resetAuthClientForTests();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('có heading, label gắn đúng ô và vùng thông báo aria-live', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
  });

  it('401: hiển thị title chung từ ProblemDetails, không gọi onSuccess', async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, { title: 'Email hoặc mật khẩu không đúng.', status: 401, code: 'InvalidCredentials' }),
    );
    const { user, onSuccess } = setup();
    await fill(user);
    expect(await screen.findByText('Email hoặc mật khẩu không đúng.')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('400: lỗi theo trường hiện cạnh đúng ô và gắn aria-invalid', async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, {
        title: 'Dữ liệu không hợp lệ',
        status: 400,
        errors: { password: ['Trường password là bắt buộc'] },
      }),
    );
    const { user } = setup();
    await fill(user);
    expect(await screen.findByText('Trường password là bắt buộc')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('429: hiện số giây từ Retry-After', async () => {
    fetchMock.mockResolvedValueOnce(
      json(429, { title: 'Bạn gửi quá nhanh, thử lại sau', status: 429 }, { 'Retry-After': '42' }),
    );
    const { user } = setup();
    await fill(user);
    expect(await screen.findByText(/thử lại sau 42 giây/)).toBeInTheDocument();
  });

  it('thành công: gửi đúng body tới BFF, lấy /me rồi gọi onSuccess', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json(200, { accessToken: 'at-1', tokenType: 'Bearer', expiresIn: 600, user: { email: 'admin@example.com' } }),
      )
      .mockResolvedValueOnce(json(200, { user: { email: 'admin@example.com', permissions: [] } }));
    const { user, onSuccess } = setup();
    await fill(user, 'admin@example.com', 'correct-horse');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'admin@example.com', password: 'correct-horse' });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/auth/me');
    // /me gửi access token vừa nhận, không có CSRF.
    const meHeaders = new Headers(fetchMock.mock.calls[1][1].headers);
    expect(meHeaders.get('Authorization')).toBe('Bearer at-1');
    expect(meHeaders.has('X-CSRF-Token')).toBe(false);
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).not.toContain('refresh');
  });
});

describe('safeReturnTo (chặn open redirect)', () => {
  it.each([
    ['/cars?page=2', '/cars?page=2'],
    ['//evil.com', '/'],
    ['/\\evil.com', '/'],
    ['https://evil.com', '/'],
    ['/login', '/'],
    [undefined, '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});
