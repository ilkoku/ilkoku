import type { MetadataRoute } from "next";

const baseUrl = "https://ilkoku.com";

// Search and AI crawlers may fetch public responses. Authentication, role checks,
// and X-Robots-Tag/noindex on private routes remain enforced independently.
// Cloudflare-managed robots.txt prefixes must also be disabled in the zone.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
