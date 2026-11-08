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

// Browser-side hardening; keep this independent from route-specific SEO rules.
// HSTS starts with a short lifetime and does not cover other subdomains.
// A narrow CSP protects against framing without changing scripts, styles,
// external payment integrations or auth form behaviour.
const browserSecurityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; upgrade-insecure-requests",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=300",
  },
];

const publicAuthNoindexRouteHeaders = [
  "/giris",
  "/giris/:path*",
  "/kayit",
  "/kayit/:path*",
  "/sifre-yenile",
  "/sifre-yenile/:path*",
  "/sifremi-unuttum",
  "/sifremi-unuttum/:path*",
] as const;

// These authentication entry/recovery pages are intentionally reachable so
// crawlers can read the noindex directive. They are not search targets, but
// links on them may still be followed.
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
  "/hesabim/:path*",
  "/kesfet/:path*",
  "/yazar-kesfet/:path*",
  "/okumaya-devam/:path*",
  "/okuyucu/:path*",
  "/rol-secimi/:path*",
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
  images: {
    qualities: [45, 60, 75],
  },
  experimental: {
    // Hostinger exposes many CPUs but limits process/thread creation.
    // Prevent Next.js page-data collection from starting 63 workers (EAGAIN).
    cpus: 2,
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: browserSecurityHeaders,
      },
      ...publicAuthNoindexRouteHeaders.map((source) => ({
        source,
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, follow, noarchive",
          },
        ],
      })),
      ...searchExcludedRouteHeaders.map((source) => ({
        source,
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      })),
      {
        source: "/landing/ilkoku-hero-user-final.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
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
        // Retired public comparison view: preserve old inbound links without
        // leaving a 404 or publishing a duplicate book-index URL.
        source: "/en-cok-satanlar/turkiye/karsilastirma",
        destination: "/en-cok-satanlar/turkiye",
        permanent: true,
      },
      {
        source: "/en-cok-satanlar/yeni-girisler",
        destination: "/en-cok-satanlar/cok-satanlara-yeni-girenler",
        permanent: true,
      },
      {
        source: "/en-cok-satanlar/yukselenler",
        destination: "/en-cok-satanlar/cok-satanlarda-yukselenler",
        permanent: true,
      },
      {
        source: "/en-cok-satanlar/her-yerde-satanlar",
        destination: "/en-cok-satanlar/birden-fazla-listede-cok-satanlar",
        permanent: true,
      },
      {
        source: "/en-cok-satanlar/uzun-satanlar",
        destination: "/en-cok-satanlar/uzun-suredir-cok-satanlar",
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
          // Preserve existing shared Open Graph image links without a redirect or 404.
          source: "/opengraph-image",
          destination: "/og/ilkoku-social-selected-2026.webp",
        },
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
