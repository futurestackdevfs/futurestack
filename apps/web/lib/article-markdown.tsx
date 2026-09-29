import type { Components } from "react-markdown";

/** Words-per-minute reading time estimate, shared by the articles list and detail pages. */
export function readingTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Maps markdown elements to theme-aware, modern typography (no @tailwindcss/typography dependency). */
export const articleMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="text-[21px] sm:text-[24px] md:text-[28px] font-bold mt-8 sm:mt-10 mb-3.5 sm:mb-4 leading-snug break-words" style={{ color: "var(--text)" }}>{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="text-[18px] sm:text-[20px] md:text-[23px] font-bold mt-7 sm:mt-9 mb-3 sm:mb-3.5 leading-snug scroll-mt-24 break-words" style={{ color: "var(--text)" }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[16px] sm:text-[17px] md:text-[19px] font-bold mt-6 sm:mt-7 mb-2.5 sm:mb-3 leading-snug break-words" style={{ color: "var(--text)" }}>{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[13.5px] sm:text-[14.5px] md:text-[15.5px] leading-[1.75] sm:leading-[1.85] mb-4 sm:mb-5 break-words" style={{ color: "var(--text2)" }}>{children}</p>
  ),
  ul: ({ children }) => <ul className="mb-4 sm:mb-5 pl-4 sm:pl-5 flex flex-col gap-2 list-disc marker:text-[var(--orange)]">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 sm:mb-5 pl-4 sm:pl-5 flex flex-col gap-2 list-decimal marker:text-[var(--orange)] marker:font-semibold">{children}</ol>,
  li: ({ children }) => <li className="text-[13.5px] sm:text-[14.5px] md:text-[15px] leading-[1.65] sm:leading-[1.75] break-words" style={{ color: "var(--text2)" }}>{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="font-semibold underline decoration-2 underline-offset-2 break-words" style={{ color: "var(--orange)", overflowWrap: "anywhere" }}>
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-bold" style={{ color: "var(--text)" }}>{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote
      className="my-5 sm:my-6 pl-3.5 sm:pl-4 py-1 text-[13px] sm:text-[14px] italic leading-relaxed break-words"
      style={{ borderLeft: "3px solid var(--orange)", color: "var(--text3)" }}
    >
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    if (!isBlock) {
      return (
        <code
          className="px-1.5 py-0.5 rounded text-[12px] sm:text-[13px] font-mono break-words"
          style={{ background: "var(--panel)", color: "var(--orange)", border: "1px solid var(--border)", overflowWrap: "anywhere" }}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`${className ?? ""} text-[12px] sm:text-[13px] font-mono leading-relaxed`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      className="mb-5 sm:mb-6 p-3 sm:p-4 rounded-xl overflow-x-auto max-w-full"
      style={{ background: "var(--hero-bg, #0b1120)", border: "1px solid var(--border)" }}
    >
      {children}
    </pre>
  ),
  hr: () => <hr className="my-7 sm:my-9" style={{ borderColor: "var(--border)" }} />,
  table: ({ children }) => (
    <div className="mb-5 sm:mb-6 overflow-x-auto rounded-xl max-w-full" style={{ border: "1px solid var(--border)" }}>
      <table className="w-full text-[12.5px] sm:text-[13.5px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: "var(--panel)" }}>{children}</thead>,
  th: ({ children }) => (
    <th className="text-left px-2.5 sm:px-3.5 py-2 sm:py-2.5 font-bold break-words whitespace-nowrap sm:whitespace-normal" style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 break-words" style={{ color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>{children}</td>
  ),
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} className="w-full h-auto rounded-xl my-5 sm:my-6" />
  ),
};
