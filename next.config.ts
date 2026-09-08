import type { NextConfig } from "next";

const privateRouteHeaders = [
  "/admin/:path*",
  "/sistem-yonetimi/:path*",
  "/harita",
  "/harita/:path*",
  "/sozlesme",
  "/sozlesme/:path*",
  "/sozlesmelerim",
  "/sozlesmelerim/:path*",
  "/icerik",
  "/icerik/:path*",
  "/bildirimler/:path*",
  "/editor/:path*",
  "/editor-daveti/:path*",
  "/editor-paneli/:path*",
  "/erisim-reddedildi/:path*",
  "/eserlerim/:path*",
  "/favorilerim/:path*",
  "/geri-bildirimler/:path*",
  "/giris/:path*",
  "/hesabim/:path*",
  "/kayit/:path*",
  "/kesfet/:path*",
  "/okumaya-devam/:path*",
  "/okuyucu/:path*",
  "/onizleme/ana-sayfa-eski",
  "/rol-secimi/:path*",
  "/sifre-yenile/:path*",
  "/tamamlanan-eserler/:path*",
  "/yazar/:path*",
  "/yazmaya-devam/:path*",
  "/yayinevi/:path*",
  "/yayinevleri/:path*",
  "/yorumlarim/:path*",
];

// Public discovery is intentionally paused. Keep these families explicitly
// non-indexable even if a future routing regression accidentally returns 200.
// Published public work detail pages under /kitap/:slug remain separate and
// indexable when their publication/privacy rules allow it.
const pausedPublicDiscoveryRouteHeaders = [
  "/eserler",
  "/eserler/:path*",
  "/yazarlar",
  "/yazarlar/:path*",
  "/turler",
  "/turler/:path*",
];

const searchExcludedRouteHeaders = [
  ...privateRouteHeaders,
  ...pausedPublicDiscoveryRouteHeaders,
];

const nextConfig: NextConfig = {
  async headers() {
    return searchExcludedRouteHeaders.map((source) => ({
      source,
      headers: [
        {
          key: "X-Robots-Tag",
          value: "noindex, nofollow, noarchive",
        },
      ],
    }));
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.ilkoku.com",
          },
        ],
        destination: "https://ilkoku.com/:path*",
        permanent: true,
      },
      {
        source: "/onizleme/ana-sayfa-yeni",
        destination: "/",
        permanent: false,
      },
      {
        source: "/admin",
        destination: "/sistem-yonetimi",
        permanent: true,
      },
      {
        source: "/admin/:path+",
        destination: "/sistem-yonetimi/:path+",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/sistem-yonetimi",
          destination: "/admin",
        },
        {
          source: "/sistem-yonetimi/:path+",
          destination: "/admin/:path+",
        },
      ],
    };
  },
};

export default nextConfig;
