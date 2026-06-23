export function Footer() {
  return (
    <footer
      style={{
        background: "var(--surface)",
        color: "var(--text)",
        borderTop: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <style>{`
        .footer-link { color: var(--muted); font-size: 13px; text-decoration: none; transition: color .2s; width: fit-content; }
        .footer-link:hover { color: var(--orange); }
        .footer-social-link {
          width: 32px; height: 32px; border-radius: 8px;
          background: var(--bg);
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--muted); font-size: 13px; text-decoration: none;
          transition: background .2s, color .2s, transform .2s;
        }
        .footer-social-link:hover { background: var(--blue); color: #fff; transform: translateY(-2px); }
        .footer-bottom-link { color: var(--muted); font-size: 12px; text-decoration: none; transition: color .2s; }
        .footer-bottom-link:hover { color: var(--orange); }
        .footer-top { padding: 44px 0 0; }
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        @media (min-width: 640px) { .footer-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 900px) { .footer-grid { grid-template-columns: 1.3fr repeat(3, 1fr) 1.3fr; } }
        .footer-brand-col { grid-column: 1; }
        @media (min-width: 900px) { .footer-brand-col { grid-column: 1; } }
        .footer-link-col { }
        .footer-sub-col { }
        @media (min-width: 900px) { .footer-sub-col { } }
        .footer-col-title {
          font-size: 12px; font-weight: 700; letter-spacing: .06em;
          text-transform: uppercase; color: var(--muted); margin: 0 0 14px;
        }
      `}</style>

      <div className="footer-top">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div className="footer-grid">
            <div className="footer-brand-col">
              <img src="/images/logo.png" alt="FutureStack" style={{ height: 40, marginBottom: 12 }} />
              <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                Think ahead. Code beyond. Build real-world skills with industry-certified courses and hands-on projects.
              </p>
            </div>

            {[
              { title: "Platform", links: ["Courses", "Career Paths", "Certifications", "Live Projects"] },
              { title: "Company", links: ["About Us", "Careers", "Blog", "Contact"] },
              { title: "Support", links: ["Help Center", "FAQs", "Community", "Refund Policy"] },
            ].map((group) => (
              <div key={group.title} className="footer-link-col">
                <h4 className="footer-col-title">{group.title}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {group.links.map((link) => (
                    <a key={link} href="#" className="footer-link">{link}</a>
                  ))}
                </div>
              </div>
            ))}

            <div className="footer-sub-col">
              <h4 className="footer-col-title">Stay Updated</h4>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  placeholder="Email address"
                  style={{
                    flex: 1,
                    height: 38,
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "0 12px",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                <button
                  style={{
                    height: 38,
                    border: "none",
                    borderRadius: 10,
                    padding: "0 16px",
                    background: "var(--orange)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Subscribe
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                {["𝕏", "in", "GH", "▶", "DC"].map((icon, i) => (
                  <a key={i} href="#" className="footer-social-link">{icon}</a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 36,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
            &copy; {new Date().getFullYear()} FutureStack Inc. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: 18 }}>
            {["Privacy Policy", "Cookie Policy", "Sitemap"].map((link) => (
              <a key={link} href="#" className="footer-bottom-link">{link}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
