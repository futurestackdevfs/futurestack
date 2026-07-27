# Course Reviews & Ratings — Frontend Guide

## Types

```typescript
interface StudentInfo { id: string; name: string; avatarUrl: string | null }
interface Review {
  id: string; rating: number; comment: string | null;
  courseId: string; studentId: string;
  createdAt: string; updatedAt: string;
  student?: StudentInfo;   // from GET /courses/:courseId/reviews
  courseTitle?: string;    // from GET /trainer/reviews
}
interface PaginatedReviews { data: Review[]; total: number; page: number; limit: number }
```

## Endpoints

### Public (no auth)
| Method | Endpoint | Response | Use |
|--------|----------|----------|-----|
| GET | `/courses/:courseId/reviews?page=1&limit=10` | `PaginatedReviews` | Reviews tab |
| GET | `/courses/:courseId/reviews/summary` | `{ averageRating, reviewCount, distribution }` | Star breakdown |

> `GET /courses/:courseId` also returns `averageRating` + `reviewCount` now—use in hero.

### Student (auth required)
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/courses/:courseId/reviews/me` | — | `Review` or 404 |
| POST | `/courses/:courseId/reviews` | `{ rating, comment }` | `Review` |
| PUT | `/courses/:courseId/reviews/:reviewId` | `{ rating, comment }` | `Review` |
| DELETE | `/courses/:courseId/reviews/:reviewId` | — | `{ message }` |

### Trainer (auth required)
| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/trainer/reviews` | `Review[]` (with `student.name`, `courseTitle`) |

## UI Flow

```
Logged-in student opens course
  → GET /courses/:courseId/reviews/me
    ├── 404 → show "Write a Review" → modal → POST
    └── 200 → show "Edit Review" / "Delete" → modal → PUT / DELETE

Trainer opens Dashboard > Feedback tab
  → GET /trainer/reviews → render table (course, student, rating, comment)

Anyone visits course page
  → show averageRating + reviewCount in hero
  → GET /courses/:courseId/reviews → paginated review cards
  → GET /courses/:courseId/reviews/summary → star distribution bars
```

## States

| Component | Loading | Empty | Error |
|-----------|---------|-------|-------|
| Reviews list | Skeleton cards | "No reviews yet" | Toast |
| Review button | Spinner | "Write a Review" | Toast |
| Trainer dashboard | Skeleton rows | "No feedback yet" | Toast |

---

> **VdoCipher Webhooks:** Yes, localhost won't work — VdoCipher's servers need to reach your endpoint. Use a **public domain** (production) or **ngrok** (for local testing) to expose your dev server.
