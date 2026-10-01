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
        ],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/recent-updates.atom`],
  };
}
