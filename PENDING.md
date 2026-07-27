# Pending Work

## Backend Ready ✅
| Feature | Status |
|---------|--------|
| Courses CRUD | Done |
| Video upload + webhooks | Done |
| Auth (JWT, Google, reset) | Done |
| Reviews & Ratings | Done (7 endpoints + summary) |
| Certificates | Done |
| Student progress | Done (heartbeat endpoint) |
| Resume playback | Done (OTP returns `initialPosition`) |

## Frontend Done ✅
| Feature | What was done |
|---------|---------------|
| Video progress heartbeat | Fixed `VdoCipherVideoPlayer` — throttle via ref, fake interval hata diya, cleanup on unmount |
| Resume playback | Player `loadeddata` event pe VdoCipher iframe ko seek bhejta hai via `postMessage` |
| Trainer feedback panel | `StudentRatingsView` already existed, sidebar me "Student Ratings" nav item add kiya |

## Frontend Pending ❌
| Feature | What to do |
|---------|------------|
| Reviews tab on course page | Show review cards + pagination on course landing page |
| Review modal | "Write a Review" / "Edit Review" modal with star rating |

## Backend Enhancement Needed ❌
| Feature | What to do |
|---------|------------|
| Caption/poster in DB | Prisma migration — add `posterUrl`, `captionUrl` to Video model |
| Webhook HMAC | Add `?secret=` query param check for security |

## Priority
1. Reviews tab + modal (course landing page)
2. Caption/poster migration (jab zaroorat ho)
