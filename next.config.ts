import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";

function resolveDeploymentId() {
  const configured =
    process.env.NEXT_DEPLOYMENT_ID?.trim() ||
    process.env.DEPLOYMENT_VERSION?.trim();

  if (configured) return configured;

  try {
    const gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return /^[0-9a-f]{40}$/iu.test(gitSha)
      ? gitSha
      : undefined;
  } catch {
    return undefined;
  }
}

const deploymentId = resolveDeploymentId();

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
  "/satis-erisim/:path*",
  "/gelirler/:path*",
  "/satinal/:path*",
  "/kutuphanem/:path*",
  "/yazmaya-devam/:path*",
  "/yayinevi/:path*",
  "/yayinevleri/:path*",
  "/yorumlarim/:path*",
];

// Demo showcase works are production test fixtures. They stay directly
// accessible for product verification but must never become search targets.
// Next custom-route sources accept regular expressions wrapped in parentheses.
const demoWorkRouteHeaders = [
  "/kitap/(demo-.*)",
];

const searchExcludedRouteHeaders = [
  ...privateRouteHeaders,
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
