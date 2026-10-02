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
          // Authenticated/member workspaces are intentionally absent from the public
          // search inventory. Block crawling instead of making Google spend requests
          // just to rediscover their X-Robots-Tag noindex headers.
          "/bildirimler",
          "/editor$",
          "/editor/",
          "/editor-daveti",
          "/editor-paneli",
          "/erisim-reddedildi",
          "/eserlerim",
          "/favorilerim",
          "/geri-bildirimler",
          "/giris",
          "/hesabim",
          "/kayit",
          "/kesfet",
          "/okumaya-devam",
          "/okuyucu",
          "/oku",
          "/rol-secimi",
          "/sifre-yenile",
          "/sifremi-unuttum",
          "/tamamlanan-eserler",
          "/yazar$",
          "/yazar/",
          "/satis-erisim",
          "/gelirler",
          "/satinal",
          "/kutuphanem",
          "/sayfa-renkleri",
          "/yazmaya-devam",
          "/yayinevi$",
          "/yayinevi/",
          "/yayinevleri$",
          "/yayinevleri/",
          "/editörler",
          "/yorumlarim",
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
