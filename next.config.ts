import type { NextConfig } from "next";

// Keep deployment versioning opt-in. A Git-SHA fallback makes every small
// self-hosted deploy produce a new ?dpl= query on otherwise cacheable Next.js
// assets, which increases repeat resource fetches. Configure one of these
// values only when the hosting topology actually needs overlapping-version
// protection during a controlled release.
const deploymentId =
  process.env.NEXT_DEPLOYMENT_ID?.trim() ||
  process.env.DEPLOYMENT_VERSION?.trim() ||
  undefined;

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
  "/rol-secimi/:path*",
  "/sifre-yenile/:path*",
  "/sifremi-unuttum",
  "/sifremi-unuttum/:path*",
  "/tamamlanan-eserler/:path*",
  "/yazar/:path*",
  "/satis-erisim/:path*",
  "/gelirler/:path*",
  "/satinal/:path*",
  "/kutuphanem/:path*",
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

// Demo showcase works are production test fixtures. They stay directly
// accessible for product verification but must never become search targets.
// Next custom-route sources accept regular expressions wrapped in parentheses.
const demoWorkRouteHeaders = [
  "/kitap/(demo-.*)",
];

const searchExcludedRouteHeaders = [
  ...privateRouteHeaders,
  ...pausedPublicDiscoveryRouteHeaders,
  ...demoWorkRouteHeaders,
];

const nextConfig: NextConfig = {
  ...(deploymentId ? { deploymentId } : {}),
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
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
