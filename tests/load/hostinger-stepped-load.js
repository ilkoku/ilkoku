import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

const targetVus = Number.parseInt(__ENV.TARGET_VUS || "25", 10);
const testDuration = __ENV.TEST_DURATION || "2m";

if (!Number.isInteger(targetVus) || targetVus < 1 || targetVus > 500) {
  throw new Error(`Unsupported TARGET_VUS: ${__ENV.TARGET_VUS}`);
}

const status200 = new Counter("status_200");
const status403 = new Counter("status_403");
const status429 = new Counter("status_429");
const status520 = new Counter("status_520");
const statusOther5xx = new Counter("status_other_5xx");
const statusOtherHttp = new Counter("status_other_http");
const transportErrors = new Counter("transport_errors");
const timeouts = new Counter("timeouts");
const captchaChallenges = new Counter("captcha_challenges");

const status200Rate = new Rate("status_200_rate");
const status403Rate = new Rate("status_403_rate");
const status429Rate = new Rate("status_429_rate");
const origin5xxRate = new Rate("origin_5xx_rate");
const transportErrorRate = new Rate("transport_error_rate");
const captchaRate = new Rate("captcha_rate");
const successfulReqDuration = new Trend("status_200_duration", true);

export const options = {
  vus: targetVus,
  duration: testDuration,
  thresholds: {
    status_200_rate: ["rate>0.98"],
    status_403_rate: ["rate<0.01"],
    status_429_rate: [
      { threshold: "rate==0", abortOnFail: true, delayAbortEval: "1s" },
    ],
    captcha_rate: [
      { threshold: "rate==0", abortOnFail: true, delayAbortEval: "1s" },
    ],
    origin_5xx_rate: ["rate<0.005"],
    transport_error_rate: ["rate<0.001"],
    status_200_duration: ["p(95)<2000", "p(99)<4000"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

export default function steppedLoadScenario() {
  const response = http.get("https://ilkoku.com/", {
    timeout: "30s",
    headers: {
      "User-Agent": "Grafana k6/2.1.0",
    },
    tags: {
      load_level: `${targetVus}vu`,
    },
  });

  const status = response.status || 0;
  const finalUrl = String(response.url || "");
  const body = typeof response.body === "string" ? response.body : "";
  const isCaptcha =
    finalUrl.includes("/.lsrecap/recaptcha") ||
    body.includes("/.lsrecap/recaptcha");
  const is200 = status === 200 && !isCaptcha;
  const is403 = status === 403;
  const is429 = status === 429;
  const is5xx = status >= 500 && status <= 599;
  const isTransportError = status === 0;
  const errorText = String(response.error || "").toLowerCase();
  const isTimeout = isTransportError && errorText.includes("timeout");

  status200Rate.add(is200);
  status403Rate.add(is403);
  status429Rate.add(is429);
  origin5xxRate.add(is5xx);
  transportErrorRate.add(isTransportError);
  captchaRate.add(isCaptcha);

  if (isCaptcha) {
    captchaChallenges.add(1);
  } else if (is200) {
    status200.add(1);
    successfulReqDuration.add(response.timings.duration);
  } else if (is403) {
    status403.add(1);
  } else if (is429) {
    status429.add(1);
  } else if (status === 520) {
    status520.add(1);
  } else if (is5xx) {
    statusOther5xx.add(1);
  } else if (isTransportError) {
    transportErrors.add(1);
    if (isTimeout) timeouts.add(1);
  } else {
    statusOtherHttp.add(1);
  }
}
