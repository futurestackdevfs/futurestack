"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface RestApiCourseCardProps {
  slug?: string;
}

export function RestApiCourseCard({ slug = "rest-api-design-with-node-js" }: RestApiCourseCardProps) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState(false);

  const course = {
    id: "rest-api-design-node",
    slug,
    category: "Web Development",
    title: "REST API Design with Node.js",
    description:
      "Design, build, and secure production-grade REST APIs with Express, MongoDB, and JWT authentication.",
    rating: 4.8,
    reviews: "320",
    hours: 48,
    students: "1.2K",
    level: "Intermediate",
    badge: "NEW",
    badgeClass: "bg-[var(--orange)]",
    mentor: "SA",
    mentorName: "Saurabh Anand",
    mentorColor: "from-[var(--blue)] to-[var(--orange)]",
    img: "/images/C6.png",
    duration: "8 wks",
  };

  const full = Math.floor(course.rating);

  return (
    <article
      className="group border border-[var(--border)] rounded-xl bg-[var(--card)] overflow-hidden cursor-pointer flex flex-col transition-[transform,box-shadow,border-color] duration-[220ms] ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-[5px] hover:shadow-[var(--shadow-lg)] hover:border-[#C7D8FF]"
      onClick={() => router.push(`/courses/${course.slug}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") router.push(`/courses/${course.slug}`); }}
    >
      <div className="relative overflow-hidden bg-[var(--bg2)] aspect-[21/8]">
        <Image src={course.img} alt={course.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(13,31,92,.55)]"></div>
        {course.badge && (
          <span className={`absolute top-2.5 left-2.5 px-3 py-[4px] rounded-[20px] text-[10.5px] font-extrabold tracking-[.5px] uppercase text-white shadow-[0_2px_10px_rgba(0,0,0,.25)] ${course.badgeClass}`}>{course.badge}</span>
        )}
      </div>

      <div className="px-[15px] py-[8px] flex-1 flex flex-col gap-[2px] min-h-[160px]">
        <div className="text-[11px] font-semibold text-[var(--orange)] uppercase tracking-[.6px]">{course.category}</div>
        <div className="font-['Syne',sans-serif] text-[14.5px] font-bold text-[var(--text)] leading-[1.35] line-clamp-2">{course.title}</div>
        <div className="text-[12px] text-[var(--muted)] leading-[1.55] line-clamp-3">{course.description}</div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-[1px]">
            {Array.from({ length: 5 }, (_, i) => (
              <svg key={`star-${i}`} className="w-[11px] h-[11px]" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill={i < full ? "#F59E0B" : "#D1D5DB"} />
              </svg>
            ))}
          </div>
          <span className="text-[11.5px] font-bold text-[var(--text)]">{Math.floor(course.rating)}</span>
          <span className="text-[11px] text-[var(--muted)]">({course.reviews})</span>
        </div>
        <div className="flex items-center gap-3 text-[11.5px] text-[var(--muted)] mt-auto pt-1">
          <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>{course.hours} hrs</span>
          <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>{course.students}</span>
          <span>{course.level}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-[15px] py-[8px_11px] border-t border-[var(--border)]">
        <div className="flex items-center gap-[7px] min-w-0">
          <div className={`w-[26px] h-[26px] rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 bg-gradient-to-br ${course.mentorColor}`}>{course.mentor}</div>
          <span className="text-[12px] text-[var(--text2)] font-medium truncate">{course.mentorName}</span>
        </div>
        <button
          className="px-[14px] py-[6px] rounded-[6px] border-none text-[11px] font-bold text-white shadow-[0_2px_6px_rgba(240,78,0,.2)] cursor-pointer transition-[opacity,transform] duration-[180ms] hover:opacity-[.88] active:scale-[.97] whitespace-nowrap"
          style={{ background: enrolled ? "linear-gradient(135deg,#22C55E,#16A34A)" : "linear-gradient(135deg,var(--orange),var(--orange2))" }}
          onClick={(e) => { e.stopPropagation(); setEnrolled(true); setTimeout(() => setEnrolled(false), 1800); }}
        >
          {enrolled ? "✓ Added!" : "Enroll →"}
        </button>
      </div>
    </article>
  );
}
