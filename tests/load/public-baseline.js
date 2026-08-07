import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "https://ilkoku.com").replace(/\/$/, "");
const PROFILE = (__ENV.PROFILE || "smoke").toLowerCase();

const pageFailureRate = new Rate("page_failure_rate");
const pageDuration = new Trend("page_duration", true);

const profiles = {
  smoke: [
    { duration: "10s", target: 2 },
    { duration: "20s", target: 2 },
    { duration: "10s", target: 0 },
  ],
  baseline: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 25 },
    { duration: "2m", target: 25 },
    { duration: "45s", target: 50 },
    { duration: "3m", target: 50 },
    { duration: "30s", target: 0 },
  ],
};

if (!profiles[PROFILE]) {
  throw new Error(`Unknown PROFILE=${PROFILE}. Use smoke or baseline.`);
}

export const options = {
  scenarios: {
    public_pages: {
      executor: "ramping-vus",
      gracefulRampDown: "15s",
      gracefulStop: "20s",
      stages: profiles[PROFILE],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    page_failure_rate: ["rate<0.01"],
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
    page_duration: ["p(95)<1500", "p(99)<3000"],
  },
  discardResponseBodies: true,
  userAgent: "IlkOku-k6-capacity-test/1.0",
};

const pages = [
  { name: "home", path: "/" },
  { name: "login", path: "/giris" },
  { name: "register", path: "/kayit" },
];

function requestPage(page) {
  const response = http.get(`${BASE_URL}${page.path}`, {
    redirects: 2,
    tags: {
      endpoint: page.name,
      test_type: "public_baseline",
    },
    timeout: "10s",
  });

  const ok = check(response, {
    [`${page.name}: status 200`]: (res) => res.status === 200,
    [`${page.name}: html response`]: (res) =>
      (res.headers["Content-Type"] || "").includes("text/html"),
  });

  pageFailureRate.add(!ok, { endpoint: page.name });
  pageDuration.add(response.timings.duration, { endpoint: page.name });
}

export default function () {
  for (const page of pages) {
    requestPage(page);
    sleep(0.35 + Math.random() * 0.65);
  }

  // Gerçek kullanıcı düşünme süresini taklit eder; gereksiz istek fırtınasını önler.
  sleep(1 + Math.random() * 2);
}

export function handleSummary(data) {
  const profile = PROFILE;
  const generatedAt = new Date().toISOString();

  return {
    stdout: `\nİlkOku public load test tamamlandı. profile=${profile} target=${BASE_URL}\n`,
    "load-summary.json": JSON.stringify(
      {
        generatedAt,
        profile,
        baseUrl: BASE_URL,
        metrics: data.metrics,
        rootGroup: data.root_group,
      },
      null,
      2,
    ),
  };
}
