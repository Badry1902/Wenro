import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";
// A different Cloudinary API address is only used by the automated tests (fake Cloudinary)
const cloudApi = process.env.CLOUDINARY_API_BASE ? new URL(process.env.CLOUDINARY_API_BASE).origin : "";
// Content Security Policy: only our own code runs; photos and videos only from the hosts we use.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://*.supabase.co",
  "media-src 'self' blob: https://res.cloudinary.com https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} https://*.supabase.co https://api.cloudinary.com https://vercel.live ${cloudApi}`.trim(),
  "frame-src https://vercel.live",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const security = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Photo uploads go through server actions (4 MB max per photo; Vercel's request limit is 4.5 MB).
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  async headers() {
    // Local http development keeps working without the https-only rule
    const list = process.env.NODE_ENV === "production" && !process.env.WENRO_LOCAL_PG_URL
      ? security
      : security.map((h) => h.key === "Content-Security-Policy" ? { ...h, value: h.value.replace("; upgrade-insecure-requests", "") } : h).filter((h) => h.key !== "Strict-Transport-Security");
    return [
      { source: "/:path*", headers: list },
      // Guests' booking pages and dashboards are never cached by shared caches
      { source: "/:locale/(booking|app)/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      // Logo animations: cached for a week (rename the file when it changes)
      { source: "/brand/motion/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
};

export default withNextIntl(nextConfig);
