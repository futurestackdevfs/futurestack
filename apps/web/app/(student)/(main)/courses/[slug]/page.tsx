import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CourseDetailClient from "./CourseDetailClient";
import type { CourseDetail } from "./CourseDetailClient";
import { SITE_NAME, SITE_URL, clampDescription, jsonLd, pageMetadata } from "@/lib/seo";

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

type PageProps = { params: Promise<{ slug: string }> };

type CourseResult = { course?: CourseDetail; missing?: boolean };

/**
 * Server-side course lookup. Next dedupes the identical GET between
 * generateMetadata and the page, and keeps it in the Data Cache for 2 minutes.
 * A backend hiccup returns nothing (the client then fetches it itself, as before);
 * only a real 404 turns into a 404 page.
 */
async function getCourse(slug: string): Promise<CourseResult> {
  try {
    const res = await fetch(`${BACKEND}/courses/public/slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 404) return { missing: true };
    if (!res.ok) return {};
    return { course: (await res.json()) as CourseDetail };
  } catch {
    return {};
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { course, missing } = await getCourse(slug);

  if (missing) return { title: "Course not found", robots: { index: false, follow: false } };
  // Backend unreachable: fall back to the generic site metadata rather than inventing a title.
  if (!course) return { alternates: { canonical: `/courses/${slug}` } };

  const path = `/courses/${course.slug || slug}`;
  // A draft course only shows its title ("Coming soon") — nothing worth indexing yet.
  if (course.comingSoon) {
    return {
      title: course.title,
      alternates: { canonical: path },
      robots: { index: false, follow: true },
    };
  }

  return pageMetadata({
    title: course.title,
    description:
      clampDescription(course.description) ??
      `Learn ${course.title} with hands-on projects, expert mentors and a certificate on ${SITE_NAME}.`,
    path,
    image: course.thumbnailUrl,
  });
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { course, missing } = await getCourse(slug);
  if (missing) notFound();

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const url = `${SITE_URL}/courses/${course?.slug || slug}`;

  const structured =
    course && !course.comingSoon
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Course",
            name: course.title,
            description: clampDescription(course.description, 500) ?? course.title,
            url,
            ...(course.thumbnailUrl ? { image: course.thumbnailUrl } : {}),
            inLanguage: "en",
            ...(course.level ? { educationalLevel: course.level } : {}),
            ...(course.whatYoullLearn?.length ? { teaches: course.whatYoullLearn } : {}),
            provider: { "@type": "Organization", name: SITE_NAME, sameAs: SITE_URL },
            ...(course.mentorName
              ? { instructor: { "@type": "Person", name: course.mentorName } }
              : {}),
            offers: {
              "@type": "Offer",
              category: "Paid",
              price: course.price,
              priceCurrency: "INR",
              availability: "https://schema.org/InStock",
              url,
            },
            hasCourseInstance: {
              "@type": "CourseInstance",
              courseMode: "Online",
              courseWorkload: `PT${Math.max(1, Math.round(course.hours || 1))}H`,
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Courses", item: `${SITE_URL}/courses` },
              { "@type": "ListItem", position: 3, name: course.title, item: url },
            ],
          },
        ]
      : [];

  return (
    <>
      {structured.map((block, i) => (
        <script
          key={i}
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(block) }}
        />
      ))}
      <CourseDetailClient initialCourse={course} />
    </>
  );
}
