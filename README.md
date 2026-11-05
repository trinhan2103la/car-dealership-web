# car-dealership-web

Frontend của dự án **Car Dealership Platform**, là một pnpm monorepo gồm:

- `apps/admin-portal` — Admin portal (Vite + React + TanStack Router/Query)
- `apps/public-web` — Public website (Next.js) — _chưa thêm_
- `packages/ui` — UI dùng chung (shadcn/ui + component viết tay)
- `packages/core-api-types` — kiểu TypeScript sinh từ OpenAPI của core (vendored)

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

Toàn hệ (DB, core, bff, web) chạy bằng Docker Compose từ repo `car-dealership-core` (`deploy/docker-compose.yml`).

## Tài liệu

Thiết kế, ERD và ADR được quản lý riêng; source code là nguồn sự thật cuối cùng.
