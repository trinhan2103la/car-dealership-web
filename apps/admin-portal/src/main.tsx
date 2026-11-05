import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { installVisibilityRefresh, onLoggedOut } from './lib/auth-client';
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Router tự gọi loader; để Query lo cache, tránh hai tầng cache chồng nhau.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Quay lại tab / mở khóa màn hình → refresh access token nếu sắp hết hạn.
installVisibilityRefresh();
// Đăng xuất ở tab khác → tab này xóa dữ liệu và về trang đăng nhập.
onLoggedOut(() => {
  queryClient.clear();
  void router.navigate({ to: '/login', replace: true });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
