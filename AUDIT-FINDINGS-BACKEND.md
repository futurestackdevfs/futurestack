# FutureStack — Backend Audit Findings (`apps/api`)

Date: 2026-08-04
Stack: NestJS, Prisma, Postgres (Supabase), JWT, VdoCipher
Build status: ✅ `nest build` passes, ✅ `tsc` clean, ⚠️ eslint 609 errors (536 auto-fixable prettier; rest unsafe `any` / unused vars)

---

## 🔴 Critical

1. **Certificate can be earned without enrollment / without real work**
   - `certificates.service.ts:8-70`, `student.service.ts:377,437`
   - A student can POST `positionSec = durationSeconds` for every video and `score: 0` for every quiz (even videos still `UPLOADING`, since duration 0 completes anything) and instantly earn a cert for a course they're not enrolled in.
   - No enrollment check, no `videoStatus READY` gate, no passing-score gate.
   - Fix: gate issuance on server-verifiable completion (READY + minimum `uniqueSecsWatched` + quiz passing score), require active enrollment, reject courses with no items.

2. **Double certificate issuance race**
   - `certificates.service.ts:10-67`
   - Concurrent heartbeat + quiz submit both pass the `existingCert` check → duplicate `credentialId`/rank or P2002 → 500.
   - Fix: wrap count + create in a `$transaction`, catch P2002 as already-issued, compute rank from the created row.

3. **VdoCipher webhooks are unauthenticated & forgeable**
   - `admin.controller.ts:80-135`
   - 8 POST endpoints, no HMAC/signature verification. Anyone with a `vdoCipherId` can overwrite titles, mark videos FAILED, or reset live videos to UPLOADING.
   - Fix: verify a shared-secret HMAC signature before dispatch; accept events only from the unified endpoint.

4. **OAuth tokens leaked in URL**
   - `auth.controller.ts:143`
   - Access + 7-day refresh token in the redirect query string → persists in browser history and Referer logs.
   - Fix: exchange a short-lived one-time code server-side, or set the refresh cookie and hand over only the access token via `postMessage`.

---

## 🟠 High

5. **Revenue features are wired to tables nobody writes**
   - `trainer.service.ts:15-169`
   - `RevenueLedger` / `Payout` have no `.create` anywhere in the repo → trainer dashboard always shows `$0` / empty payouts.
   - Fix: populate `RevenueLedger` at enrollment/payment time, or remove/flag the endpoints.

6. **JWT trusts stale claims**
   - `auth/strategies/jwt.strategy.ts:25-36` does no DB lookup — deactivated/rejected users or downgraded roles keep access for the token's 15-min lifetime.
   - Fix: load user + check `isActive`/current role in `validate()`.

7. **Course locking is cosmetic**
   - `student.service.ts:342-412` — `getCourseDetail` computes `isLocked`/`isCurrent`, but `updateVideoProgress`/`submitQuiz` only check enrollment, so a student can submit progress for any later video directly.
   - Fix: enforce the "first incomplete item" rule server-side.

8. **Public course cards expose every video ID**
   - `courses.service.ts:322` (comment at 315 says to hide non-preview IDs).
   - Fix: emit `id: v.isPreview ? v.id : null`.

---

## 🟡 Medium

9. **Malformed `filters` query crashes public endpoint**
   - `courses.controller.ts:209` — `JSON.parse(filters)` throws unhandled `SyntaxError` → 500 on a public route.
   - Fix: wrap in try/catch or validate with a pipe.

10. **Certificate check runs on every heartbeat after completion**
    - `student.service.ts:400-402` — `if (isNowCompleted || wasCompleted)` triggers 6+ DB queries every 5-10s heartbeat.
    - Fix: only call when `justCompleted`.

11. **Concurrent token refresh throws unhandled P2025**
    - `auth.service.ts:86-87` — delete-then-create rotation; two parallel refreshes → second `delete` hits P2025 → 500. `/auth/refresh` is also unthrottled.
    - Fix: use `deleteMany` (idempotent) or catch P2025; add throttling.

12. **`getVideoUploadCredentials` 500s on missing video**
    - `admin.service.ts:216-239` — `dto.videoId` present but no matching Video row → `prisma.video.update` P2025 → 500.
    - Fix: look up first, throw clean `NotFoundException`.

13. **`getVideoOtp` non-null assertion on possibly-missing user**
    - `student.service.ts:487-495` — `student!.name`/`student!.email` throws TypeError → 500 if the user row is gone.
    - Fix: throw `NotFoundException` when null.

14. **Concurrent upvotes cause unhandled P2002**
    - `discussion.service.ts:221-256` — find → create/delete non-atomically; second concurrent create violates the unique index → 500.
    - Fix: upsert with composite `where`, or catch P2002 as "already upvoted".

15. **Concurrent course-code generation can duplicate**
    - `courses.service.ts:563-572` — `generateCourseCode` reads max code, concurrent creates → same code → P2002 500.
    - Fix: catch P2002 and retry with next sequence, or use a DB sequence.

16. **Quiz submit overwrites best score, never stores pass/fail**
    - `student.service.ts:414-457` — upsert overwrites previous score with any client value (downgrade possible); `passed` computed but not persisted/gated.
    - Fix: keep best score; gate `isCompleted` on `passingScore` when set.

17. **`updateVideoProgress` can regress under concurrent heartbeats**
    - `student.service.ts:371-398` — max computed from a stale read; two writes can leave a lower value.
    - Fix: atomic update (`updateMany` with `uniqueSecsWatched: { lt: clamped }`) or `$transaction`.

18. **Trainer rating is an unweighted average**
    - `reviews.service.ts:114-126` — averages course-level ratings ignoring `reviewCount`; a 1-review course drags a trainer down as much as a 500-review course. Course + trainer updates are two separate writes.
    - Fix: weight by review count; wrap both writes in a `$transaction`.

19. **Progress % inconsistent between trainer and student views**
    - `trainer.service.ts:213-217` (videos only, no enrollment filter) vs `student.service.ts:128-151` (videos + quizzes) — same student shows different percentages.
    - Fix: share the same item model and filter active enrollments.

20. **`deleteVideo` order can orphan the VdoCipher asset**
    - `courses.service.ts:913-918` — VdoCipher delete before DB delete; DB failure leaves a row pointing at a deleted video.
    - Fix: DB-first with compensation, treat VdoCipher failure as non-fatal.

21. **Discussion access too broad for staff**
    - `discussion.service.ts:12-28` — `role !== STUDENT` grants any COORDINATOR/SUPPORT/TRAINER read/write in every course's discussion.
    - Fix: restrict non-author staff actions to the trainer's own courses.

22. **Discussion pagination unvalidated**
    - `discussion.controller.ts:42-43` — raw `parseInt` on `page`/`limit`; negatives/huge values produce odd or unbounded queries.
    - Fix: `ParseIntPipe` with `Min`/`Max` bounds.

23. **`getRecentAchievements` / course lists unbounded**
    - `certificates.controller.ts:167` fetches all certs then dedups; `courses.service.ts:177-180,649-668` loads all active courses for one slug / for card sorting; `trainer.service.ts:172-186,229-263` unbounded lists.
    - Fix: `take` with caps, slug index, push sort/filter into SQL.

24. **`CreateResourceDto` accepts arbitrary URLs**
    - `courses/dto/create-resource.dto.ts:7-11` — no URL format check; `javascript:`/`data:` URLs could be stored and rendered. Course update DTO allows setting `code` to a duplicate → P2002 500.
    - Fix: `@IsUrl()` (http/https) and uniqueness check before update.

---

## 🟢 Low / cleanup

- **Lint:** 609 errors — 536 auto-fixable prettier; real ones: unsafe `any` in `vdocipher.service.ts`, unused vars `trainer.service.ts:312`.
- **SSL verification disabled:** `prisma.service.ts:15` — `ssl: { rejectUnauthorized: false }` enables MITM on DB traffic. Fix: verify CA in production.
- **PII logging:** `google.strategy.ts:33` — `console.log((profile as any)._json)` dumps the full Google profile to stdout.
- **Upload filtering checks extension only:** `upload.controller.ts:36-61`, `student.controller.ts:94-99`, `trainer.controller.ts:67-72` — no content/MIME check; polyglot files can be stored and served from static `/uploads` (`main.ts:25`). Fix: magic-byte check + `nosniff`.
- **No global Prisma exception filter:** `main.ts:10-28` — P2002/P2025 surface as generic 500s across several routes. Fix: register `PrismaClientExceptionFilter` (P2002→409, P2025→404).
- **Hardcoded revenue figures:** `trainer.service.ts:131-140` — `collectionPct: 100` and `collectedSoFar === totalFees`; EMI/partial collection never reflected; `enrollmentCount` counts enrollments with no ledger entry.
- **Mail/S3 failures swallowed:** `mail.service.ts:35-39` (reset email "link sent" even when send fails), `s3.service.ts:127-129` (delete failures only logged → orphaned objects).
- **Dead module:** `course/course.controller.ts` + `course.service.ts` are never registered in `app.module.ts`; if wired up they'd publicly leak `vdoCipherId` + DRAFT courses.
- **`isCompleted` threshold vs duration 0:** `student.service.ts:377` — `durationSeconds === 0` (still uploading) satisfies completion on any heartbeat. Fix: require `videoStatus === 'READY'` and `durationSeconds > 0`.

---

## ✅ Clean areas

- `student.controller.ts` — auth + throttling on all routes; no IDOR (IDs from token)
- `reviews.controller.ts` / `reviews.service.ts` create/update — enrollment and ownership checks sound
- `auth.module.ts`, guards, `local.strategy.ts` — standard wiring; register/login/forgot flow reasonable (generic anti-enumeration)
- `courses.controller.ts` — role guards consistently applied; route ordering safe
- `discussion.controller.ts` — author-based edit/delete checks correct
- `prisma.service.ts` onModuleInit/onModuleDestroy — fine aside from SSL note
- DTO validation generally strong (`whitelist`, `forbidNonWhitelisted` in `main.ts:23`)
