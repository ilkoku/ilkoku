import http from "k6/http";
import { Counter } from "k6/metrics";

const status200 = new Counter("status_200");
const status403 = new Counter("status_403");
const status429 = new Counter("status_429");
const status500 = new Counter("status_500");
const status502 = new Counter("status_502");
const status503 = new Counter("status_503");
const status504 = new Counter("status_504");
const status520 = new Counter("status_520");
const status522 = new Counter("status_522");
const status524 = new Counter("status_524");
const other5xx = new Counter("status_other_5xx");
const otherHttp = new Counter("status_other_http");
const transportErrors = new Counter("transport_errors");

export const options = {
  stages: [
    { duration: "2m", target: 100 },
    { duration: "3m", target: 500 },
    { duration: "3m", target: 1000 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

export default function hostingerSupportLoadScenario() {
  const response = http.get("https://ilkoku.com", { timeout: "30s" });
  const status = response.status;

  if (status === 200) status200.add(1);
  else if (status === 403) status403.add(1);
  else if (status === 429) status429.add(1);
  else if (status === 500) status500.add(1);
  else if (status === 502) status502.add(1);
  else if (status === 503) status503.add(1);
  else if (status === 504) status504.add(1);
  else if (status === 520) status520.add(1);
  else if (status === 522) status522.add(1);
  else if (status === 524) status524.add(1);
  else if (status >= 500 && status <= 599) other5xx.add(1);
  else if (status === 0) transportErrors.add(1);
  else otherHttp.add(1);
}
