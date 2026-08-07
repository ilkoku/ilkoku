import http from "k6/http";

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

export default function () {
  http.get("https://ilkoku.com");
}
