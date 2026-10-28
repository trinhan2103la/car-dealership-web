# Quy ước đóng góp — car-dealership-web

Repo này nằm trong hệ 3 repo của dự án Car Dealership Platform:

- `car-dealership-web` — Public website (Next.js) + Admin portal (React), pnpm monorepo (repo này)
- `car-dealership-bff` — NestJS BFF
- `car-dealership-core` — ABP / .NET 10 core API

Clone cả ba repo ngang hàng trong cùng một thư mục cha (ví dụ `D:\WorkSpace\FRT\PROJECT_PERSONAL\`) để Docker Compose và quy trình local tham chiếu chéo được.

## Nhánh

Luôn tạo nhánh từ `main`, không commit thẳng vào `main`.

```
<type>/<mô-tả-kebab-case>
```

`type` ∈ `feat | fix | chore | docs | test | refactor | build | ci | perf | style`.
Ví dụ: `feat/car-list-filter`, `fix/slug-redirect`, `chore/setup-ci`.

## Commit message — Conventional Commits

```
type(scope): mô tả ngắn
```

- `type`: như danh sách trên.
- `scope` (tùy chọn): `public-web`, `admin-portal`, `shared`...
- Mô tả: ngắn gọn, không bắt buộc hoa/thường, không chấm cuối.

Ví dụ:

```
feat(public-web): them trang chi tiet xe
fix(admin-portal): sua loi 409 khi luu CarModel
chore(ci): them job gitleaks
```

commitlint sẽ chặn commit sai quy ước (qua husky hook `commit-msg`).

## Pull request

- Mở PR vào `main`, điền đủ checklist trong template.
- Làm một mình vẫn nên qua PR để giữ thói quen và có branch protection bảo vệ.
