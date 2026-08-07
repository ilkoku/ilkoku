import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "https://ilkoku.com").replace(/\/$/, "");
const PROFILE = (__ENV.PROFILE || "smoke").toLowerCase();

const pageFailureRate = new Rate("page_failure_rate");
const pageDuration = new Trend("page_duration", true);

const status200 = new Counter("http_status_200");
const status3xx = new Counter("http_status_3xx");
const status403 = new Counter("http_status_403");
const status429 = new Counter("http_status_429");
const statusOther4xx = new Counter("http_status_other_4xx");
const status5xx = new Counter("http_status_5xx");
const statusOther = new Counter("http_status_other");
const transportErrors = new Counter("transport_errors");
const timeoutErrors = new Counter("timeout_errors");

const endpointFailures = {
  home: new Counter("endpoint_failures_home"),
  login: new Counter("endpoint_failures_login"),
  register: new Counter("endpoint_failures_register"),
};

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
};

if (!profiles[PROFILE]) {
  throw new Error(
    `Unknown PROFILE=${PROFILE}. Use smoke, baseline, capacity100, capacity200 or diagnostic150.`,
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
  discardResponseBodies: true,
  userAgent: "IlkOku-k6-capacity-test/1.0",
};

const pages = [
  { name: "home", path: "/" },
  { name: "login", path: "/giris" },
  { name: "register", path: "/kayit" },
];

let failureFingerprintLogged = false;

function getHeader(response, headerName) {
  const target = headerName.toLowerCase();
  for (const [name, value] of Object.entries(response.headers || {})) {
    if (name.toLowerCase() === target) {
      return String(value);
    }
  }
  return "";
}

function recordResponse(response, endpoint) {
  const status = Number(response.status || 0);
  const errorText = String(response.error || "");

  if (status === 200) {
    status200.add(1);
  } else if (status >= 300 && status < 400) {
    status3xx.add(1);
  } else if (status === 403) {
    status403.add(1);
  } else if (status === 429) {
    status429.add(1);
  } else if (status >= 400 && status < 500) {
    statusOther4xx.add(1);
  } else if (status >= 500 && status < 600) {
    status5xx.add(1);
  } else if (status === 0) {
    transportErrors.add(1);
  } else {
    statusOther.add(1);
  }

  if (errorText.toLowerCase().includes("timeout")) {
    timeoutErrors.add(1);
  }

  if (status !== 200 || errorText) {
    endpointFailures[endpoint].add(1);

    // En fazla VU başına bir hata parmak izi loglanır. Böylece yüksek yükte log fırtınası oluşmaz.
    if (!failureFingerprintLogged) {
      const server = getHeader(response, "server");
      const retryAfter = getHeader(response, "retry-after");
      const cfRay = getHeader(response, "cf-ray");
      const hcdnRequestId = getHeader(response, "x-hcdn-request-id");
      console.warn(
        `DIAGNOSTIC_FAIL profile=${PROFILE} vu=${__VU} endpoint=${endpoint} status=${status} error=${JSON.stringify(errorText)} server=${JSON.stringify(server)} retry_after=${JSON.stringify(retryAfter)} cf_ray=${JSON.stringify(cfRay)} hcdn_request_id=${JSON.stringify(hcdnRequestId)}`,
      );
      failureFingerprintLogged = true;
    }
  }
}

function requestPage(page) {
  const response = http.get(`${BASE_URL}${page.path}`, {
    redirects: 2,
    tags: {
      endpoint: page.name,
      test_type: `public_${PROFILE}`,
    },
    timeout: "10s",
  });

  recordResponse(response, page.name);

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
