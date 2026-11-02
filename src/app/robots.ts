import type { MetadataRoute } from "next";

// A test site must not appear in search results.
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_SITE_MODE === "preview") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/booking", "/book", "/signin", "/api"] }] };
}
