import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from "@/components/ui/toast-container";
import { SessionExpiredModal } from "@/components/ui/session-expired-modal";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.futurestack.co.in"),
  title: "FutureStack – Think . Create. Conquer",
  description: "Your personalized learning platform. Build skills, earn certificates, and advance your career.",
  keywords: [
    "FutureStack",
    "online courses",
    "e-learning",
    "certifications",
    "career development",
    "upskilling",
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "FutureStack",
    title: "FutureStack – Think . Create. Conquer",
    description: "Your personalized learning platform. Build skills, earn certificates, and advance your career.",
    locale: "en_US",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Per-request CSP nonce set by middleware.ts — stamped onto our inline
  // <script> tags below so they survive the strict CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      data-theme="light"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" type="image/png" href="/images/iconlogo.png" />
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.futurestack.co.in/#organization",
                  name: "FutureStack",
                  url: "https://www.futurestack.co.in",
                  logo: "https://www.futurestack.co.in/images/logo.png",
                  description: "Your personalized learning platform. Build skills, earn certificates, and advance your career.",
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.futurestack.co.in/#website",
                  url: "https://www.futurestack.co.in",
                  name: "FutureStack – Think . Create. Conquer",
                  description: "Your personalized learning platform. Build skills, earn certificates, and advance your career.",
                  publisher: { "@id": "https://www.futurestack.co.in/#organization" },
                },
              ],
            }),
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Non-render-blocking font load: injected as media="print" then swapped
            to media="all" once downloaded, so it never blocks first paint. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&family=Fraunces:ital,wght@0,400;0,500;0,600;1,500;1,600&family=Manrope:wght@400;500;600;700;800&display=swap';l.media='print';l.onload=function(){l.media='all'};document.head.appendChild(l);})();`,
          }}
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&family=Fraunces:ital,wght@0,400;0,500;0,600;1,500;1,600&family=Manrope:wght@400;500;600;700;800&display=swap"
          />
        </noscript>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('fs-theme');
                  if (theme) document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <ToastContainer />
          <SessionExpiredModal />
        </Providers>
      </body>
    </html>
  );
}
