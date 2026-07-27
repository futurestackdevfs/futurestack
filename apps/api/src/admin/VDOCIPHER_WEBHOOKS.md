# VdoCipher Webhook Implementation

## Overview

7 VdoCipher webhook event handlers in `AdminService` that process async video lifecycle events and sync the local database. Supports two usage modes:

1. **Unified endpoint** — single catch-all URL dispatches via `payload.event`
2. **7 individual endpoints** — one URL per event, each forces its own event type

---

## Files Changed

| File | Action |
|------|--------|
| `admin/dto/vdocipher-webhook.dto.ts` | **New** — typed DTO with `@IsIn()` event validation |
| `admin/admin.controller.ts` | **Updated** — 1 unified + 7 individual POST routes |
| `admin/admin.service.ts` | **Updated** — dispatcher + 7 private handlers, added `Logger` |
| `admin/VDOCIPHER_WEBHOOKS.md` | This file |

---

## DTO: `VdoCipherWebhookPayload`

- `hookId?: string` — `@IsString()` `@IsOptional()`
- `time?: number` — `@IsNumber()` `@IsOptional()`
- `event: string` — `@IsString()` `@IsIn(['video:ready','video:updated','video:deleted','video:error','caption:ready','caption:deleted','poster:ready'])`
- `payload: { id, title?, length?, status?, error?, captionId?, language?, posterUrl? }` — `@IsOptional()`

---

## API Endpoints

**Base:** `/admin` | **Method:** POST | **Rate limit:** 30/60s | **Auth:** None

### Unified
| Path | Dispatch |
|------|----------|
| `/admin/videos/vdocipher-webhook` | Routes by `payload.event` |

### Individual (each overrides `event` to its hardcoded value)
| Path | Forced Event |
|------|-------------|
| `/admin/videos/webhook/video-ready` | `video:ready` |
| `/admin/videos/webhook/video-updated` | `video:updated` |
| `/admin/videos/webhook/video-deleted` | `video:deleted` |
| `/admin/videos/webhook/video-error` | `video:error` |
| `/admin/videos/webhook/caption-ready` | `caption:ready` |
| `/admin/videos/webhook/caption-deleted` | `caption:deleted` |
| `/admin/videos/webhook/poster-ready` | `poster:ready` |

---

## Dispatcher: `handleVdoCipherWebhook(payload)`

Logs event → `switch(payload.event)` → routes to private handler → returns `{ received: true }`.

All handlers:
1. Find video by `payload.payload.id` (vdoCipherId)
2. If not found → log warning, return `{ received: true }`
3. Perform DB update / action
4. Log outcome
5. Return `{ received: true }`

---

## 7 Handlers

### `handleVideoReady`
- Updates: `videoStatus = 'READY'`, `durationSeconds` from `payload.payload.length`
- Log: `info` "Video {id} marked as READY"

### `handleVideoUpdated`
- Updates: `title` and/or `durationSeconds` (only fields present in payload)
- Log: `info` "Video {id} metadata updated"

### `handleVideoDeleted`
- Updates: `videoStatus = 'UPLOADING'` (allows re-upload, does NOT delete the DB record)
- Log: `info` "Video {id} reset to UPLOADING after deletion on VdoCipher"

### `handleVideoError`
- Updates: `videoStatus = 'FAILED'`
- Log: `error` "Video {id} failed: {error message}"

### `handleCaptionReady`
- Action: **Log only** — no DB persistence (Video model has no caption field)
- Log: `info` "Caption ready for video {id}: language={lang}, captionId={id}"

### `handleCaptionDeleted`
- Action: **Log only**
- Log: `info` "Caption deleted for video {id}: language={lang}, captionId={id}"

### `handlePosterReady`
- Action: **Log only** — no DB persistence (Video model has no posterUrl field)
- Log: `info` "Poster ready for video {id}: {posterUrl}"

---

## Database

```prisma
enum VideoStatus { UPLOADING PROCESSING READY FAILED }

model Video {
  id              String        @id @default(uuid())
  title           String
  vdoCipherId     String
  durationSeconds Int
  order           Int
  isPreview       Boolean       @default(false)
  videoStatus     VideoStatus   @default(UPLOADING)
  section         Section       @relation(fields: [sectionId], references: [id])
  sectionId       String
  progress        VideoProgress[]
}
```

**Missing fields (need migration):** `posterUrl String?`, `captionUrl String?`

---

## Security

- No `@Auth()` — VdoCipher cannot pass JWT tokens
- Verification: checks existence of `vdoCipherId` in DB before any mutation
- Rate limit: 30 req/60s per endpoint
- **Future:** Add optional `?secret=` HMAC query param check

---

## Build

```
cd apps/api
npx nest build
```

---

## Limitations

| Issue | Fix Needed |
|-------|-----------|
| Captions not persisted | Add `captionUrl` field to Video + migration |
| Poster not persisted | Add `posterUrl` field to Video + migration |
| No HMAC verification | Add optional `?secret=` check |
| No dedup tracking | Add webhook_log table for `hookId` dedup |
