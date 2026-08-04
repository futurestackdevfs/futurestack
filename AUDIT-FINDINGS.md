# FutureStack — Project Audit Findings

Date: 2026-08-04
Scope: `apps/api` (NestJS), `apps/web` (Next.js 16 + Tailwind), `packages/types`

Build status at time of audit:
- ✅ `apps/api` — `nest build` passes, `tsc` clean
- ✅ `apps/web` — `next build` passes, `tsc --noEmit` clean
- ⚠️ Lint — `apps/api` 609 errors (536 auto-fixable prettier; rest unsafe `any`/unused vars), `apps/web` 281 errors/warnings

---

## 🔴 Critical (production-data / security)

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

## 🟠 High (wrong behavior)

5. **Undefined CSS variables across ~50 spots**
   - `globals.css` only defines `--card-hover`; `--blue2`, `--sh-lg`, `--yellow`, `--border3`, `--card-h`, `--color-scheme`, `--blue-dim` are referenced but never defined.
   - Instances: `CourseLearningView.tsx:365,386,402,444,464,498,523,647`, `cart/page.tsx:99,104,136,213-247,253`, `QuizPlayer.tsx:219,244,252,275`, `ProjectsSection.tsx:81,90,92,153`, `CertificatesSection.tsx:104,110,208,384,420`, `MyCoursesSection.tsx:31-34,139,173,290,293`, `DiscussionTab.tsx:28,413`, `profile/page.tsx:214,313`.
   - Impact: blue text/icons/gradients render with inherited (often invisible) colors, box-shadows and focus rings dropped, date-picker color-scheme unset.
   - Fix: define these seven variables in both `[data-theme="light"]` and `[data-theme="dark"]` blocks in `globals.css`.

6. **Ops Logout deletes the wrong cookie**
   - `ops/components/logout-button.tsx:9`
   - DELETEs `/api/auth/set-token` (the **student** cookie); the staff session (`fs_staff_token`) stays alive and ops pages remain accessible.
   - Fix: use `clearStaffToken()` + DELETE `/api/auth/set-token-staff` (as `admin/page.tsx:993-998` does).

7. **4 admin tabs have fake, non-persistent data**
   - `ops/admin/page.tsx:67,310-367`
   - Batches / Fee Plans / Cert Templates / Departments are never fetched from the API; Add/Edit/Delete only mutate a module-level in-memory `DB` that evaporates on refresh. Tables show empty.
   - Fix: wire each entity to its backend endpoint (or persist to localStorage with a "local-only" badge).

8. **Revenue features are wired to tables nobody writes**
   - `trainer.service.ts:15-169`
   - `RevenueLedger` / `Payout` have no `.create` anywhere in the repo → trainer dashboard always shows `$0` / empty payouts.
   - Fix: populate `RevenueLedger` at enrollment/payment time, or remove/flag the endpoints.

9. **`/certificates` standalone page can never show real certs**
   - `CertificatesSection.tsx:296` → `skipApi = !enrolledCount || enrolledCount === 0`
   - The page at `app/(student)/(main)/certificates/page.tsx` renders it with no props → always the static locked view. Dashboard path works via `SectionRenderer.tsx:55`.
   - Fix: fetch real data on the standalone page and pass `enrolledCount`.

10. **Trainer posting a reply never updates the thread**
    - `ops/trainer/page.tsx:339-342`
    - POSTs + toasts success but never calls `setDoubts` (every sibling handler does). Reply and "Reply · N" badge stay stale until reload.
    - Fix: append the returned reply to the matching message's `replies`.

11. **Trainer course thumbnail = dead `blob:` URL**
    - `ops/trainer/sections/CourseModal.tsx:98-100`
    - `URL.createObjectURL(file)` is never uploaded; the saved URL is dead after refresh. Admin `MasterDataModal.tsx:66-83` does it correctly.
    - Also `CourseModal.tsx:90,204-231`: the hr/min duration unit toggle is never saved to the payload.
    - Fix: mirror the MasterDataModal upload flow; include the unit in the submitted payload.

12. **4 public pages unauthenticated**
    - `/ops/sales`, `/ops/support`, `/ops/coordinator`, `/ops/content-manager` — no session check, no middleware exists in `apps/web`. Anyone can view them.
    - Fix: shared auth guard reusing `loadStaffToken` → redirect, or add middleware.

13. **JWT trusts stale claims**
    - `auth/strategies/jwt.strategy.ts:25-36` does no DB lookup — deactivated/rejected users or downgraded roles keep access for the token's 15-min lifetime.
    - Fix: load user + check `isActive`/current role in `validate()`.

14. **Course locking is cosmetic**
    - `student.service.ts:342-412` — `getCourseDetail` computes `isLocked`/`isCurrent`, but `updateVideoProgress`/`submitQuiz` only check enrollment, so a student can submit progress for any later video directly.
    - Fix: enforce the "first incomplete item" rule server-side.

15. **Public course cards expose every video ID**
    - `courses.service.ts:322` (comment at 315 says to hide non-preview IDs). Also `courses.controller.ts:209` — malformed `filters` query string throws unhandled `SyntaxError` → 500.
    - Fix: emit `id: v.isPreview ? v.id : null`; wrap `JSON.parse` in try/catch or a pipe.

---

## 🟡 Medium (UI/UX glitches)

16. **Cart checkout is fully simulated**
    - `cart/page.tsx:47-50` — `setTimeout(…,1600)` fake payment, hardcoded order ID `FS-ORD-88291`, static items with "★ 0.0". No payment/enrollment API call.

17. **Quiz questions are fake but scores are persisted**
    - `QuizPlayer.tsx:15-49` — hardcoded generic questions posted as real scores to `/api/student/quizzes/:id/submit`; silent `catch` on failure.

18. **Dead buttons (no onClick / no href)**
    - `CertificatesSection.tsx:364` "Share on LinkedIn", `:368` "Download All", `:546` "Add to LinkedIn", `:550` "Copy Link", `:597` "Continue Learning"
    - `cart/page.tsx:142` "Move to Cart", `:320` "Download Invoice"
    - `live-classes/page.tsx:21` "View Schedule", `:45` "Join Class"
    - `OverviewSection.tsx:102` "View Schedule"
    - `MyCoursesSection.tsx:236-238` "⋯" overflow menu
    - `courses/[slug]/page.tsx:863` "🔓 Unlock Full Course" (primary pricing CTA)

19. **Sidebar links → 404 routes (no page exists)**
    - `/skill-tests`, `/leaderboard`, `/study-groups`, `/settings`, `/help`, `/projects`
    - Linked from `my-dashboard/page.tsx:278-287,426-434`, `quick-actions.tsx:3-10`, `OverviewSection.tsx:233`, `(student)/page.tsx:66`.

20. **Assignments widget is static**
    - `AssignmentsSection.tsx:98-102` sort dropdown has no `value`/`onChange`; `:66-68` calendar "today" hardcoded to day 17 with wrong weekday; data is hardcoded.

21. **Discussion missing from `SECTION_CONFIG`**
    - `section-config.tsx:28-53` — `"discussion"` is in `SECTION_ORDER` but not in `SECTION_CONFIG` → `getSectionDef("discussion")` returns undefined; sidebar badge hardcoded `"12"` instead of real counts.

22. **Checkboxes/links that do nothing**
    - `student-login-form.tsx:170-172` "Remember me" (no state), `:182` Terms/Privacy `href="#"`
    - `staff-login.tsx:227-229` "Keep me signed in" (no state), `:230` Forgot password `href="#"`
    - `staff-login.tsx:9-11` + `auth/oauth/callback/page.tsx` — `atob` token decode without try/catch.

23. **Silent failures render as "empty success"**
    - `AdminDashboardContent.tsx:20-28,42-43` `.catch(() => {})` → null while loading AND when errored
    - `UsersDashboardContent.tsx:48-56`, `TrainerDashboardContent.tsx:57-63`, `FeaturedManager.tsx:85-111`, `StudentRatingsView.tsx:21-34` — all swallow errors → blank/empty tables.

24. **Responsive issues**
    - `cart/page.tsx:89,205` — fixed `grid-cols-[1fr_340px]` with no mobile breakpoint → overflow below ~768px
    - `CourseLearningView.tsx:260` — fixed `lg:grid-cols-[385px_1fr]`
    - `quick-actions.tsx:25` — `grid-cols-4` for 6 items leaves 2 orphaned cells
    - `ops/admin/sections/KpiStrip.tsx:17` — fixed `grid-cols-6`
    - `ops/admin/sections/EntityTable.tsx:69` — tables no `overflow-x-auto`/`min-w` → compress below ~1100px
    - `ops/trainer/console/DoubtsView.tsx:301-303` — fixed `w-[240px]` pane never collapses on mobile
    - `ops/admin/sections/VideoUploadDialog.tsx:175,213` — `max-h-[90vh] overflow-hidden` with no inner `overflow-y-auto` → clipped on short screens

25. **DiscussionTab read-state race**
    - `DiscussionTab.tsx:104` — `readIds` hydrated from `me` at first render; if auth lands after mount, unread state stays wrong until remount.

26. **Plain `<a>` full-page reloads**
    - `popular-courses.tsx:40`, `career-paths.tsx:32`, `student-login-form.tsx:174` — use plain anchors instead of `next/link`.

---

## 🟢 Low / cleanup

- **API lint:** 609 errors — 536 auto-fixable prettier; real ones: unsafe `any` in `vdocipher.service.ts`, unused vars `trainer.service.ts:312`. Web lint: 281 errors/warnings.
- **Unhandled errors → 500:** `getVideoUploadCredentials` P2025 on missing video (`admin.service.ts:216-239`); `getVideoOtp` `student!` non-null assertion (`student.service.ts:487-495`); concurrent refresh P2025 (`auth.service.ts:86-87`); concurrent upvote P2002 (`discussion.service.ts:221-256`); duplicate course code P2002 (`courses.service.ts:563-572`).
- **Security hardening:** `ssl: { rejectUnauthorized: false }` on DB pool (`prisma.service.ts:15`); Google PII `console.log` (`google.strategy.ts:33`); upload filtering checks extension only (`upload.controller.ts:36-61`, `student.controller.ts:94-99`, `trainer.controller.ts:67-72`); `CreateResourceDto.fileUrl` accepts arbitrary URLs; no global Prisma exception filter (`main.ts`).
- **Logic bugs:** trainer rating is unweighted average (`reviews.service.ts:114-126`); quiz submit overwrites best score (`student.service.ts:414-457`); trainer vs student progress % inconsistent (`trainer.service.ts:213-217` vs `student.service.ts:128-151`); `collectionPct: 100` hardcoded (`trainer.service.ts:131-140`); `deleteVideo` order can orphan VdoCipher asset (`courses.service.ts:913-918`).
- **Performance:** cert check on every heartbeat after completion (`student.service.ts:400-402`); unbounded queries (`certificates.controller.ts:167`, `courses.service.ts:177-180,649-668`, `trainer.service.ts:172-186,229-263`, `discussion.service.ts:30-42`).
- **Dead code:** `course` module never registered (`course/`) — would leak `vdoCipherId` + drafts if wired up; `ops/components/OpsTopbar.tsx`, `OpsSidebar.tsx` unimported; `ops/admin/roles/*.tsx` duplicates of `console/*.tsx`.

---

## ✅ Clean areas

- `VdoCipherVideoPlayer.tsx` — heartbeat/keepalive pipeline is solid
- `forgot-password` / `reset-password` pages — proper `Suspense` + `useSearchParams`, min-8 rule
- Auth guards, reviews enrollment/ownership checks, `ops-fetch.ts` (JWT refresh + role retry), `CurriculumBuilder.tsx`, hero carousel
