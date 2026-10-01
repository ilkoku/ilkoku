import type { MetadataRoute } from "next";

const baseUrl = "https://ilkoku.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/media/"],
        disallow: [
          "/admin",
          "/icerik$",
          "/icerik/",
          "/sistem-yonetimi",
          "/harita",
          "/sozlesme",
          "/sozlesmelerim",
          "/api",
          "/auth",
          // First-party Google Tag Gateway measurement path; analytics is not required for page rendering.
          "/1q6z",
        ],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/recent-updates.atom`],
  };
}
