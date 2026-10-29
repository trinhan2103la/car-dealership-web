# car-dealership-web

Frontend của dự án **Car Dealership Platform**, là một pnpm monorepo gồm:

- `apps/public-web` — Public website (Next.js 16) — _thêm ở Ngày 113+_
- `apps/admin-portal` — Admin portal (Vite + React) — _thêm ở Ngày 140+_
- `packages/core-api-types` — kiểu TypeScript sinh từ OpenAPI của core (vendored) — _thêm ở Ngày 39+_

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
# các app sẽ được thêm ở các ngày sau; khi có:
# pnpm --filter public-web dev
# pnpm --filter admin-portal dev
```

Toàn hệ (DB, core, bff, web) chạy bằng Docker Compose từ repo `car-dealership-core` (`deploy/docker-compose.yml`).

## Tài liệu
sadsadsad

Thiết kế/ERD/ADR/roadmap: spec `car-dealership-platform` trong Kiro. Source code là nguồn sự thật cuối cùng.
