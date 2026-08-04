# FutureStack — Frontend Audit Findings (`apps/web`)

Date: 2026-08-04
Stack: Next.js 16 (Turbopack), React, Tailwind CSS
Build status: ✅ `next build` passes, ✅ `tsc --noEmit` clean, ⚠️ eslint 281 errors/warnings

---

## 🔴 Critical

1. **Undefined CSS variables across ~50 spots**
   - `globals.css` only defines `--card-hover`; `--blue2`, `--sh-lg`, `--yellow`, `--border3`, `--card-h`, `--color-scheme`, `--blue-dim` are referenced but never defined.
   - Instances: `CourseLearningView.tsx:365,386,402,444,464,498,523,647`, `cart/page.tsx:99,104,136,213-247,253`, `QuizPlayer.tsx:219,244,252,275`, `ProjectsSection.tsx:81,90,92,153`, `CertificatesSection.tsx:104,110,208,384,420`, `MyCoursesSection.tsx:31-34,139,173,290,293`, `DiscussionTab.tsx:28,413`, `profile/page.tsx:214,313`.
   - Impact: blue text/icons/gradients render with inherited (often invisible) colors; box-shadows and focus rings dropped; date-picker color-scheme unset.
   - Fix: define these seven variables in both `[data-theme="light"]` and `[data-theme="dark"]` blocks in `globals.css`.

---

## 🟠 High

2. **Ops Logout deletes the wrong cookie**
   - `ops/components/logout-button.tsx:9`
   - DELETEs `/api/auth/set-token` (the **student** cookie); the staff session (`fs_staff_token`) stays alive and ops pages remain accessible.
   - Fix: use `clearStaffToken()` + DELETE `/api/auth/set-token-staff` (as `admin/page.tsx:993-998` does).

3. **4 admin tabs have fake, non-persistent data**
   - `ops/admin/page.tsx:67,310-367`
   - Batches / Fee Plans / Cert Templates / Departments are never fetched from the API; Add/Edit/Delete only mutate a module-level in-memory `DB` that evaporates on refresh. Tables show empty.
   - Fix: wire each entity to its backend endpoint (or persist to localStorage with a "local-only" badge).

4. **`/certificates` standalone page can never show real certs**
   - `CertificatesSection.tsx:296` → `skipApi = !enrolledCount || enrolledCount === 0`
   - The page at `app/(student)/(main)/certificates/page.tsx` renders it with no props → always the static locked view. Dashboard path works via `SectionRenderer.tsx:55`.
   - Fix: fetch real data on the standalone page and pass `enrolledCount`.

5. **Trainer posting a reply never updates the thread**
   - `ops/trainer/page.tsx:339-342`
   - POSTs + toasts success but never calls `setDoubts` (every sibling handler does). Reply and "Reply · N" badge stay stale until reload.
   - Fix: append the returned reply to the matching message's `replies`.

6. **Trainer course thumbnail = dead `blob:` URL**
   - `ops/trainer/sections/CourseModal.tsx:98-100`
   - `URL.createObjectURL(file)` is never uploaded; the saved URL is dead after refresh. Admin `MasterDataModal.tsx:66-83` does it correctly.
   - Also `CourseModal.tsx:90,204-231`: the hr/min duration unit toggle is never saved to the payload.
   - Fix: mirror the MasterDataModal upload flow; include the unit in the submitted payload.

7. **4 public pages unauthenticated**
   - `/ops/sales`, `/ops/support`, `/ops/coordinator`, `/ops/content-manager` — no session check, no middleware exists in `apps/web`. Anyone can view them.
   - Fix: shared auth guard reusing `loadStaffToken` → redirect, or add middleware.

---

## 🟡 Medium

8. **Cart checkout is fully simulated**
   - `cart/page.tsx:47-50` — `setTimeout(…,1600)` fake payment, hardcoded order ID `FS-ORD-88291`, static items with "★ 0.0". No payment/enrollment API call.

9. **Quiz questions are fake but scores are persisted**
   - `QuizPlayer.tsx:15-49` — hardcoded generic questions posted as real scores to `/api/student/quizzes/:id/submit`; silent `catch` on failure.

10. **Dead buttons (no onClick / no href)**
    - `CertificatesSection.tsx:364` "Share on LinkedIn", `:368` "Download All", `:546` "Add to LinkedIn", `:550` "Copy Link", `:597` "Continue Learning"
    - `cart/page.tsx:142` "Move to Cart", `:320` "Download Invoice"
    - `live-classes/page.tsx:21` "View Schedule", `:45` "Join Class"
    - `OverviewSection.tsx:102` "View Schedule"
    - `MyCoursesSection.tsx:236-238` "⋯" overflow menu
    - `courses/[slug]/page.tsx:863` "🔓 Unlock Full Course" (primary pricing CTA)

11. **Sidebar links → 404 routes (no page exists)**
    - `/skill-tests`, `/leaderboard`, `/study-groups`, `/settings`, `/help`, `/projects`
    - Linked from `my-dashboard/page.tsx:278-287,426-434`, `quick-actions.tsx:3-10`, `OverviewSection.tsx:233`, `(student)/page.tsx:66`.

12. **Assignments widget is static**
    - `AssignmentsSection.tsx:98-102` sort dropdown has no `value`/`onChange`; `:66-68` calendar "today" hardcoded to day 17 with wrong weekday; data is hardcoded.

13. **Discussion missing from `SECTION_CONFIG`**
    - `section-config.tsx:28-53` — `"discussion"` is in `SECTION_ORDER` but not in `SECTION_CONFIG` → `getSectionDef("discussion")` returns undefined; sidebar badge hardcoded `"12"` instead of real counts.

14. **Checkboxes/links that do nothing**
    - `student-login-form.tsx:170-172` "Remember me" (no state), `:182` Terms/Privacy `href="#"`
    - `staff-login.tsx:227-229` "Keep me signed in" (no state), `:230` Forgot password `href="#"`
    - `staff-login.tsx:9-11` + `auth/oauth/callback/page.tsx` — `atob` token decode without try/catch.

15. **Silent failures render as "empty success"**
    - `AdminDashboardContent.tsx:20-28,42-43` `.catch(() => {})` → null while loading AND when errored
    - `UsersDashboardContent.tsx:48-56`, `TrainerDashboardContent.tsx:57-63`, `FeaturedManager.tsx:85-111`, `StudentRatingsView.tsx:21-34` — all swallow errors → blank/empty tables.

16. **Responsive issues**
    - `cart/page.tsx:89,205` — fixed `grid-cols-[1fr_340px]` with no mobile breakpoint → overflow below ~768px
    - `CourseLearningView.tsx:260` — fixed `lg:grid-cols-[385px_1fr]`
    - `quick-actions.tsx:25` — `grid-cols-4` for 6 items leaves 2 orphaned cells
    - `ops/admin/sections/KpiStrip.tsx:17` — fixed `grid-cols-6`
    - `ops/admin/sections/EntityTable.tsx:69` — tables no `overflow-x-auto`/`min-w` → compress below ~1100px
    - `ops/trainer/console/DoubtsView.tsx:301-303` — fixed `w-[240px]` pane never collapses on mobile
    - `ops/admin/sections/VideoUploadDialog.tsx:175,213` — `max-h-[90vh] overflow-hidden` with no inner `overflow-y-auto` → clipped on short screens

17. **DiscussionTab read-state race**
    - `DiscussionTab.tsx:104` — `readIds` hydrated from `me` at first render; if auth lands after mount, unread state stays wrong until remount.

18. **Plain `<a>` full-page reloads**
    - `popular-courses.tsx:40`, `career-paths.tsx:32`, `student-login-form.tsx:174` — use plain anchors instead of `next/link`.

---

## 🟢 Low / cleanup

- **Lint:** 281 errors/warnings across the app.
- **Dead code:** `ops/components/OpsTopbar.tsx`, `OpsSidebar.tsx` unimported by anything; `ops/admin/roles/*.tsx` are near-duplicates of `ops/admin/console/*.tsx` with static mock rows and are never imported.
- **Achievements list key collision:** `components/achievements.tsx:27` uses `key={item.name}` — duplicate names would collide.
- **Home sidebar width:** `home-sidebar.tsx:14` fixed `w-[295px]` becomes full-width under `lg` (acceptable, but login form `max-w-[280px]` can feel cramped on mobile).

---

## ✅ Clean areas

- `VdoCipherVideoPlayer.tsx` — heartbeat/keepalive pipeline is solid
- `forgot-password` / `reset-password` pages — proper `Suspense` + `useSearchParams`, min-8 rule
- `hero.tsx` carousel (rAF + guarded for single slide), `resume-learning.tsx`, `jobs` / `paths` pages
- `ops/lib/ops-fetch.ts` (JWT refresh + role retry), `CurriculumBuilder.tsx`, `EntityTable.tsx`, `ProfileModal.tsx`, `ResourceManagerModal.tsx`, `ConfirmDialog.tsx`, `Statusbar.tsx`
