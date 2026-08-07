import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

const status200 = new Counter("status_200");
const status403 = new Counter("status_403");
const status429 = new Counter("status_429");
const status520 = new Counter("status_520");
const status5xxOther = new Counter("status_5xx_other");
const transportErrors = new Counter("transport_errors");
const failed = new Rate("diagnostic_failed");
const latency = new Trend("diagnostic_latency", true);
let samplesLogged = 0;

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "30s", target: 25 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    diagnostic_failed: ["rate<0.01"],
    diagnostic_latency: ["p(95)<2000"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

export default function () {
  const res = http.get("https://ilkoku.com", {
    redirects: 0,
    timeout: "15s",
    tags: { endpoint: "home" },
  });

  latency.add(res.timings.duration);

  if (res.status === 200) status200.add(1);
  else if (res.status === 403) status403.add(1);
  else if (res.status === 429) status429.add(1);
  else if (res.status === 520) status520.add(1);
  else if (res.status >= 500 && res.status <= 599) status5xxOther.add(1);
  else if (res.status === 0) transportErrors.add(1);

  const ok = res.status === 200;
  failed.add(!ok);

  if (!ok && samplesLogged < 12) {
    samplesLogged += 1;
    const server = res.headers.Server || res.headers.server || "";
    const cfRay = res.headers["Cf-Ray"] || res.headers["cf-ray"] || "";
    const hcdn = res.headers["X-Hcdn-Request-Id"] || res.headers["x-hcdn-request-id"] || "";
    console.error(`DIAGNOSTIC_FAILURE status=${res.status} duration_ms=${res.timings.duration} server="${server}" cf_ray="${cfRay}" hcdn_request_id="${hcdn}"`);
  }
}
