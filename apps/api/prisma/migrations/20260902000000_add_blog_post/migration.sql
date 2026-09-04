CREATE TABLE "BlogPost" (
  "id" SERIAL NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "metaDescription" VARCHAR(500) NOT NULL,
  "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "sourceTopic" VARCHAR(255),
  "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlogPost_slug_key" UNIQUE ("slug")
);

CREATE INDEX "BlogPost_status_publishedAt_idx" ON "BlogPost" ("status", "publishedAt");