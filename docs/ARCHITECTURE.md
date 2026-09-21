# FutureStack Architecture

pnpm monorepo.

| Path | What it is |
|---|---|
| `apps/web` | Next.js 16 (React 19, Tailwind 4, SWR). Frontend and BFF. |
| `apps/api` | NestJS 11 + Prisma 7 (Postgres). ~30 modules, ~300 routes. |
| `packages/types` | Shared TypeScript types. |
| `n8n-pipeline` | Blog automation; posts to the API's `internal/articles` routes using `BlogApiKeyGuard`. |

## Request flow

Browser -> `apps/web/app/api/[...proxy]/route.ts` -> NestJS API (`API_URL`).

- The proxy strips `/api`, forwards `Authorization`, cookies and client IP.
- If no `Authorization` header is sent it falls back to the `fs_token` (student) or `fs_token_staff` cookie.
- `GET` on paths containing `/public/` is cached by Next for 5 minutes. Everything else is `no-store`.
- `/uploads/*` is rewritten to the API (`next.config.ts`).

## Web routes (`apps/web/app`)

- `(student)/(main)`: about, courses, courses/[slug], faq, articles, articles/[slug], careers, certificates, live-projects, order-history, research-and-development, support (tickets).
- `(student)`: home, `profile`, `my-dashboard` (Overview, MyCourses, CourseLearning, ProjectLearning, Assignments, Schedule, Certificates, SkillTests, Quiz/SkillTest players, Discussion, video players).
- `cart`: cart and checkout (Razorpay).
- `auth`: student login, staff-login, forgot / reset / set-new-password, OAuth callback.
- `ops`: staff consoles, each with `page.tsx`, `console/` views, `sections/` chrome and `lib/`.
  - `admin`, `sales`, `trainer`, `coordinator`, `support`, `content-manager`.

## Security

- **Session tokens**: the access JWT lives only in an HttpOnly cookie (`fs_token` student, `fs_token_staff` staff). The browser stores just the user id and non-secret claims (`fs_claims`, `fs_staff_claims`) and sends a marker (`Authorization: Bearer cookie:student|staff`). The proxy swaps the marker for the matching cookie JWT, so the portal is explicit. See `apps/web/app/auth/lib/token-store.ts` and `token-claims.ts`.
- `proxy.ts` sets a per-request nonce CSP (`strict-dynamic`) and redirects `/ops/*` to staff login when `fs_token_staff` is missing. This is a coarse gate; the API enforces real authorization.
- Static headers (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy) are in `next.config.ts`.
- API: helmet, compression, `ValidationPipe` (whitelist + forbidNonWhitelisted), Throttler, audit interceptor, Razorpay webhook signature check on the raw body.
- `dangerouslySetInnerHTML` is used only for static JSON-LD/inline scripts in `layout.tsx` (nonce'd) and for `mdInline` in live-projects, which HTML-escapes input first.

## API modules (`apps/api/src`)

auth, student, trainer, coordinator, sales, sales-targets, support, admin, admin-payments, courses, projects, discussion, certificates, reviews, cart (+ wishlist), checkout, coupon, refund, invoices, payment-settings, legal-pages, careers, blog, contact, upload, vdocipher, mail, ai, audit, prisma.

Data model: `apps/api/prisma/schema.prisma` (migrations in `apps/api/prisma/migrations`).

## External services

Razorpay (payments), VdoCipher (video), S3 (uploads), AgentMail (email), Google OAuth, Google Analytics 4.

## Local development

See the root `README.md`: `pnpm install`, then `pnpm dev:web` and `pnpm dev:api`.
