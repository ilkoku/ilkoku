import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalInHtml, canonicalPath, cases, firstPartyUrl, headersFromRaw } from "./seo-redirect-chain-audit.mjs";

test("Raw HTTP headers preserve each Location, status and Cloudflare Ray", () => {
  const raw = "HTTP/1.1 200 Connection established\r\n\r\nHTTP/2 308\r\nlocation: https://ilkoku.com/nasil-calisir\r\ncf-ray: test123-IAD\r\n\r\n";
  const headers = headersFromRaw(raw);
  assert.equal(headers.get("location"), "https://ilkoku.com/nasil-calisir");
  assert.equal(headers.get("cf-ray"), "test123-IAD");
});

test("Query parameters never masquerade as alternate canonical routes", () => {
  assert.equal(canonicalPath("https://ilkoku.com/nasil-calisir/?utm_source=a"), "https://ilkoku.com/nasil-calisir");
  assert.equal(canonicalInHtml('<head><link rel="canonical" href="https://ilkoku.com/nasil-calisir"/></head>'), "https://ilkoku.com/nasil-calisir");
});

test("Any cross-host redirects and non-HTTP links fail closed", () => {
  for (const url of ["https://evil.example/", "https://blog.ilkoku.com/", "ftp://ilkoku.com/"]) {
    assert.throws(() => firstPartyUrl(url));
  }
  assert.equal(firstPartyUrl("http://www.ilkoku.com/").hostname, "www.ilkoku.com");
});

test("Legacy 404s are not mass redirected and live checks are bounded", () => {
  assert.ok(cases.length <= 12);
  assert.equal(cases.filter((x) => x.expectedStatus === 404).length, 2);
  assert.equal(cases.filter((x) => x.expectedStatus === 200).length, 0);
  const code = readFileSync("scripts/seo-redirect-chain-audit.mjs", "utf8");
  assert.match(code, /const MAX_HOPS = 5/u);
  assert.match(code, /const REQUEST_GAP_MS = 1000/u);
  assert.match(code, /--max-redirs", "0"/u);
  assert.match(code, /Circuit breaker/u);
  assert.match(code, /REDIRECT_HOP/u);
  assert.doesNotMatch(code, /status:\s*301[,}]|permanent:\s*true/u);
});

test("Audit runs one time per explicit workflow update; no hourly crawler", () => {
  const workflow = readFileSync(".github/workflows/seo-redirect-chain-audit.yml", "utf8");
  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /push:/u);
  assert.match(workflow, /paths:/u);
  assert.match(workflow, /if: always\(\)/u);
  assert.doesNotMatch(workflow, /schedule:|workflow_run:|k6 |npm run deploy/u);
});
