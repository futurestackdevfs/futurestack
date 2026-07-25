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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="email"
                  placeholder="Email address"
                  style={{
                    flex: 1,
                    minWidth: 140,
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
                    flex: "0 0 auto",
                  }}
                >
                  Subscribe
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <a href="#" className="footer-social-link" title="X (Twitter)"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                <a href="#" className="footer-social-link" title="LinkedIn"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
                <a href="#" className="footer-social-link" title="GitHub"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg></a>
                <a href="#" className="footer-social-link" title="YouTube"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
                <a href="#" className="footer-social-link" title="Discord"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg></a>
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
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 10, textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
            &copy; {new Date().getFullYear()} FutureStack Inc. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
            {["Privacy Policy", "Cookie Policy", "Sitemap"].map((link) => (
              <a key={link} href="#" className="footer-bottom-link">{link}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
