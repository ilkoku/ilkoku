import type { MetadataRoute } from "next";

const baseUrl = "https://ilkoku.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/api/media/",
          "/api/site-assets/",
        ],
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
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
