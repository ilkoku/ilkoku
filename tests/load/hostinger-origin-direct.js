import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "").replace(/\/$/, "");
const ORIGIN_IP = (__ENV.ORIGIN_IP || "").trim();
const PROFILE = (__ENV.PROFILE || "smoke").toLowerCase();
const SHARD_ID = __ENV.SHARD_ID || "single";
const BASE_HOST = BASE_URL.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];

if (!BASE_URL || !ORIGIN_IP || !BASE_HOST) {
  throw new Error("BASE_URL, ORIGIN_IP and a valid preview hostname are required.");
}

const pageFailureRate = new Rate("page_failure_rate");
const pageDuration = new Trend("page_duration", true);
const httpStatus200 = new Counter("http_status_200");
const httpStatus403 = new Counter("http_status_403");
const httpStatus429 = new Counter("http_status_429");
const httpStatus5xx = new Counter("http_status_5xx");
const transportErrors = new Counter("transport_errors");
const timeoutErrors = new Counter("timeout_errors");

const statusCounters = {};
for (const code of [500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530]) {
  statusCounters[code] = new Counter(`http_status_${code}`);
}

const profiles = {
  smoke: [
    { duration: "10s", target: 2 },
    { duration: "20s", target: 2 },
    { duration: "10s", target: 0 },
  ],
  capacity100: [
    { duration: "45s", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 75 },
    { duration: "2m", target: 75 },
    { duration: "30s", target: 100 },
    { duration: "3m", target: 100 },
    { duration: "30s", target: 0 },
  ],
};

if (!profiles[PROFILE]) {
  throw new Error(`Unknown PROFILE=${PROFILE}. Use smoke or capacity100.`);
}

export const options = {
  hosts: {
    [BASE_HOST]: ORIGIN_IP,
  },
  scenarios: {
    origin_pages: {
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
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  discardResponseBodies: true,
  userAgent: `IlkOku-k6-origin-direct/1.0 shard/${SHARD_ID}`,
};

const pages = [
  { name: "home", path: "/" },
  { name: "login", path: "/giris" },
  { name: "register", path: "/kayit" },
];

function classify(response, page) {
  const status = response.status;
  const tags = { endpoint: page.name, shard: SHARD_ID };

  if (status === 200) httpStatus200.add(1, tags);
  else if (status === 403) httpStatus403.add(1, tags);
  else if (status === 429) httpStatus429.add(1, tags);
  else if (status >= 500 && status < 600) {
    httpStatus5xx.add(1, tags);
    if (statusCounters[status]) statusCounters[status].add(1, tags);
  } else if (status === 0) {
    transportErrors.add(1, tags);
    if ((response.error || "").toLowerCase().includes("timeout")) {
      timeoutErrors.add(1, tags);
    }
  }
}

function requestPage(page) {
  const response = http.get(`${BASE_URL}${page.path}`, {
    redirects: 0,
    timeout: "10s",
    tags: {
      endpoint: page.name,
      shard: SHARD_ID,
      test_type: `origin_${PROFILE}`,
    },
  });

  classify(response, page);

  const ok = check(response, {
    [`${page.name}: status 200`]: (res) => res.status === 200,
    [`${page.name}: html response`]: (res) =>
      (res.headers["Content-Type"] || "").includes("text/html"),
  });

  pageFailureRate.add(!ok, { endpoint: page.name, shard: SHARD_ID });
  pageDuration.add(response.timings.duration, { endpoint: page.name, shard: SHARD_ID });
}

export default function () {
  for (const page of pages) {
    requestPage(page);
    sleep(0.35 + Math.random() * 0.65);
  }
  sleep(1 + Math.random() * 2);
}

export function handleSummary(data) {
  return {
    stdout: `\nİlkOku Hostinger origin-direct test tamamlandı. profile=${PROFILE} shard=${SHARD_ID} host=${BASE_HOST} origin=${ORIGIN_IP}\n`,
    "load-summary.json": JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        profile: PROFILE,
        shardId: SHARD_ID,
        baseUrl: BASE_URL,
        originIp: ORIGIN_IP,
        metrics: data.metrics,
        rootGroup: data.root_group,
      },
      null,
      2,
    ),
  };
}
