import Script from "next/script";

/**
 * Google Analytics 4 (gtag.js) — mounted once in the root layout so it loads
 * on every route. Uses next/script's `afterInteractive` strategy, which is
 * Next.js's own recommended loading strategy for analytics tags: it doesn't
 * block initial hydration but still fires early enough to capture the first
 * page view.
 *
 * Renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID isn't set (e.g. local
 * dev without the var configured), so dev traffic never gets sent to the
 * production GA property.
 */
export function GoogleAnalytics({ nonce }: { nonce?: string }) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga4-init" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
