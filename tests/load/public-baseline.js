import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "https://ilkoku.com").replace(/\/$/, "");
const PROFILE = (__ENV.PROFILE || "smoke").toLowerCase();
const SHARD_ID = __ENV.SHARD_ID || "single";
const FAILURE_DIAGNOSTICS = (__ENV.FAILURE_DIAGNOSTICS || "0") === "1";

const pageFailureRate = new Rate("page_failure_rate");
const pageDuration = new Trend("page_duration", true);

const httpStatus200 = new Counter("http_status_200");
const httpStatus3xx = new Counter("http_status_3xx");
const httpStatus403 = new Counter("http_status_403");
const httpStatus429 = new Counter("http_status_429");
const httpStatusOther4xx = new Counter("http_status_other_4xx");
const httpStatus5xx = new Counter("http_status_5xx");
const httpStatus500 = new Counter("http_status_500");
const httpStatus502 = new Counter("http_status_502");
const httpStatus503 = new Counter("http_status_503");
const httpStatus504 = new Counter("http_status_504");
const httpStatusOther5xx = new Counter("http_status_other_5xx");
const httpStatusOther = new Counter("http_status_other");
const transportErrors = new Counter("transport_errors");
const timeoutErrors = new Counter("timeout_errors");
const endpointFailuresHome = new Counter("endpoint_failures_home");
const endpointFailuresLogin = new Counter("endpoint_failures_login");
const endpointFailuresRegister = new Counter("endpoint_failures_register");

let diagnosticSamplesLogged = 0;

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
  capacity100: [
    { duration: "45s", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 75 },
    { duration: "2m", target: 75 },
    { duration: "30s", target: 100 },
    { duration: "3m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  capacity200: [
    { duration: "45s", target: 100 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 150 },
    { duration: "2m", target: 150 },
    { duration: "30s", target: 200 },
    { duration: "3m", target: 200 },
    { duration: "30s", target: 0 },
  ],
  diagnostic150: [
    { duration: "20s", target: 100 },
    { duration: "45s", target: 100 },
    { duration: "20s", target: 110 },
    { duration: "45s", target: 110 },
    { duration: "20s", target: 125 },
    { duration: "1m", target: 125 },
    { duration: "20s", target: 140 },
    { duration: "1m", target: 140 },
    { duration: "20s", target: 150 },
    { duration: "2m", target: 150 },
    { duration: "30s", target: 0 },
  ],
  distributedprobe100: [
    { duration: "20s", target: 50 },
    { duration: "20s", target: 100 },
    { duration: "1m", target: 100 },
    { duration: "20s", target: 0 },
  ],
};

if (!profiles[PROFILE]) {
  throw new Error(
    `Unknown PROFILE=${PROFILE}. Use smoke, baseline, capacity100, capacity200, diagnostic150 or distributedProbe100.`,
  );
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
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  discardResponseBodies: true,
  userAgent: `IlkOku-k6-capacity-test/1.0 shard/${SHARD_ID}`,
};

const pages = [
  { name: "home", path: "/" },
  { name: "login", path: "/giris" },
  { name: "register", path: "/kayit" },
];

function header(response, name) {
  return response.headers[name] || response.headers[name.toLowerCase()] || "";
}

function clean(value) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").replace(/"/g, "'").slice(0, 220);
}

function maybeLogFailure(response, page) {
  if (!FAILURE_DIAGNOSTICS || __VU > 8 || diagnosticSamplesLogged >= 1) return;

  diagnosticSamplesLogged += 1;
  console.warn(
    `EDGE_DIAGNOSTIC profile=${PROFILE} shard=${SHARD_ID} vu=${__VU} endpoint=${page.name} ` +
      `status=${response.status} error="${clean(response.error)}" ` +
      `server="${clean(header(response, "Server"))}" ` +
      `retry_after="${clean(header(response, "Retry-After"))}" ` +
      `cf_ray="${clean(header(response, "Cf-Ray"))}" ` +
      `cf_cache_status="${clean(header(response, "Cf-Cache-Status"))}" ` +
      `hcdn_request_id="${clean(header(response, "Hcdn-Request-Id"))}"`,
  );
}

function classifyResponse(response, page) {
  const status = response.status;
  const tags = { endpoint: page.name, shard: SHARD_ID };

  if (status === 200) httpStatus200.add(1, tags);
  else if (status >= 300 && status < 400) httpStatus3xx.add(1, tags);
  else if (status === 403) httpStatus403.add(1, tags);
  else if (status === 429) httpStatus429.add(1, tags);
  else if (status >= 400 && status < 500) httpStatusOther4xx.add(1, tags);
  else if (status >= 500 && status < 600) {
    httpStatus5xx.add(1, tags);
    if (status === 500) httpStatus500.add(1, tags);
    else if (status === 502) httpStatus502.add(1, tags);
    else if (status === 503) httpStatus503.add(1, tags);
    else if (status === 504) httpStatus504.add(1, tags);
    else httpStatusOther5xx.add(1, tags);
  } else if (status === 0) {
    transportErrors.add(1, tags);
    if ((response.error || "").toLowerCase().includes("timeout")) {
      timeoutErrors.add(1, tags);
    }
  } else httpStatusOther.add(1, tags);
}

function recordEndpointFailure(page) {
  if (page.name === "home") endpointFailuresHome.add(1);
  if (page.name === "login") endpointFailuresLogin.add(1);
  if (page.name === "register") endpointFailuresRegister.add(1);
}

function requestPage(page) {
  const response = http.get(`${BASE_URL}${page.path}`, {
    redirects: 2,
    tags: {
      endpoint: page.name,
      test_type: `public_${PROFILE}`,
      shard: SHARD_ID,
    },
    timeout: "10s",
  });

  classifyResponse(response, page);

  const ok = check(response, {
    [`${page.name}: status 200`]: (res) => res.status === 200,
    [`${page.name}: html response`]: (res) =>
      (res.headers["Content-Type"] || "").includes("text/html"),
  });

  if (!ok) {
    recordEndpointFailure(page);
    maybeLogFailure(response, page);
  }

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
  const generatedAt = new Date().toISOString();

  return {
    stdout: `\nİlkOku public load test tamamlandı. profile=${PROFILE} shard=${SHARD_ID} target=${BASE_URL}\n`,
    "load-summary.json": JSON.stringify(
      {
        generatedAt,
        profile: PROFILE,
        shardId: SHARD_ID,
        baseUrl: BASE_URL,
        metrics: data.metrics,
        rootGroup: data.root_group,
      },
      null,
      2,
    ),
  };
}
