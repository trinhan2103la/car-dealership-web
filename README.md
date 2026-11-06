# car-dealership-web

Frontend của dự án **Car Dealership Platform**, là một pnpm monorepo gồm:

- `apps/admin-portal` — Admin portal (Vite + React + TanStack Router/Query)
- `apps/public-web` — Public website (Next.js) — _chưa thêm_
- `packages/ui` — UI dùng chung (shadcn/ui + component viết tay)
- `packages/core-api-types` — kiểu TypeScript sinh từ OpenAPI của core (vendored)

## Demo

- Admin_Portal: https://car-dealership-web-pink.vercel.app (Vercel Hobby, Root Directory `apps/admin-portal`). Hiện có đăng nhập/đăng xuất; tài khoản demo không công khai.
- `apps/admin-portal/vercel.json` rewrite `/api/*` sang BFF trên Render, nên cookie refresh `__Host-cdp_rt` là first-party trên domain Vercel.
- BFF và Core_API trên Render free ngủ sau 15 phút; lần đăng nhập đầu có thể chậm hoặc báo "Dịch vụ phản hồi quá chậm", chờ rồi thử lại.
- Trạng thái tổng của dự án (đã xong / chưa xong): README của `car-dealership-core`.

## Hệ 3 repo

Clone cả ba repo **ngang hàng (sibling)** dưới cùng thư mục cha (ví dụ `D:\WorkSpace\FRT\PROJECT_PERSONAL\`):

```
car-dealership-web\    (repo này)
car-dealership-bff\
car-dealership-core\
```

## Chạy local

```powershell
pnpm install
pnpm turbo run dev --filter=admin-portal   # Admin portal, cần BFF đang chạy
```

DB và Core_API chạy bằng Docker Compose từ repo `car-dealership-core` (`deploy/docker-compose.yml`); BFF chạy bằng `pnpm start:dev` trong `car-dealership-bff`. Vite proxy `/api` sang `BFF_URL` (mặc định `http://localhost:3000`).

## Tài liệu

Thiết kế, ERD và ADR được quản lý riêng; source code là nguồn sự thật cuối cùng.
