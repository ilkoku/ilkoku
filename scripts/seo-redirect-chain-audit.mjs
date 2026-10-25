import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DOMAIN = "ilkoku.com";
const MAX_HOPS = 5;
const REQUEST_GAP_MS = 1000;
const DEST = "/tmp/ilkoku-seo-redirect-chain-report.json";

// Previously checked 8 legacy WordPress URLs were 404. Recheck only two distinctive samples.
export const cases = [
  { id: "http-apex", url: "http://ilkoku.com/", expected: "https://ilkoku.com/" },
  { id: "http-www", url: "http://www.ilkoku.com/", expected: "https://ilkoku.com/" },
  { id: "https-www", url: "https://www.ilkoku.com/", expected: "https://ilkoku.com/" },
  { id: "www-how", url: "https://www.ilkoku.com/nasil-calisir", expected: "https://ilkoku.com/nasil-calisir" },
  { id: "trailing-slash", url: "https://ilkoku.com/nasil-calisir/", expected: "https://ilkoku.com/nasil-calisir" },
  { id: "utm", url: "https://ilkoku.com/nasil-calisir?utm_source=seo-audit&utm_campaign=test", expected: "https://ilkoku.com/nasil-calisir" },
  { id: "www-genre-slash", url: "https://www.ilkoku.com/yazarlar-icin/kurgu/roman/", expected: "https://ilkoku.com/yazarlar-icin/kurgu/roman" },
  { id: "genre-query", url: "https://ilkoku.com/yazarlar-icin/kurgu/roman?orderby=title&order=asc", expected: "https://ilkoku.com/yazarlar-icin/kurgu/roman" },
  { id: "editors-slash", url: "https://ilkoku.com/editorler-icin/", expected: "https://ilkoku.com/editorler-icin" },
  { id: "double-slash", url: "https://ilkoku.com/yazarlar-icin//kurgu/roman", expected: "https://ilkoku.com/yazarlar-icin/kurgu/roman" },
  { id: "legacy-tag", url: "https://www.ilkoku.com/tag/imza/", expectedStatus: 404 },
  { id: "legacy-amp", url: "https://www.ilkoku.com/annelik-duygusunun-ortak-tanimi-diyebilecegimiz-10-baslik/amp", expectedStatus: 404 },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export function firstPartyUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || ![DOMAIN, "www." + DOMAIN].includes(url.hostname)) {
    throw new Error("Unexpected redirect target: " + value);
  }
  return url;
}

export function headersFromRaw(raw) {
  const blocks = raw.split(/\r?\n\r?\n/).filter((x) => /^HTTP\/[\d.]+ \d{3}\b/iu.test(x.trim()));
  const last = blocks.at(-1) ?? "";
  const lines = last.split(/\r?\n/u);
  const headers = new Map();
  for (const line of lines.slice(1)) {
    const at = line.indexOf(":");
    if (at < 1) continue;
    const key = line.slice(0, at).trim().toLowerCase();
    const value = line.slice(at + 1).trim();
    headers.set(key, value);
  }
  return headers;
}

export function canonicalInHtml(html) {
  for (const link of html.match(/<link\b[^>]+>/giu) ?? []) {
    if (!/\brel=["']canonical["']/iu.test(link)) continue;
    const href = link.match(/\bhref=["']([^"']+)["']/iu);
    if (href) return href[1];
  }
  return null;
}

export function canonicalPath(value) {
  const url = firstPartyUrl(value);
  const normalized = url.pathname.length > 1 ? url.pathname.replace(/\/+$/u, "") : "/";
  return "https://" + DOMAIN + normalized;
}

function probe(url) {
  const dir = mkdtempSync(join(tmpdir(), "ilkoku-redirect-"));
  try {
    const hdr = join(dir, "headers.txt");
    const body = join(dir, "body.txt");
    const result = spawnSync("curl", [
      "--silent", "--show-error", "--path-as-is", "--max-redirs", "0",
      "--connect-timeout", "8", "--max-time", "20",
      "--user-agent", "IlkOku-Redirect-Chain-Audit/1.0",
      "--dump-header", hdr, "--output", body, "--write-out", "%{http_code}", url,
    ], { encoding: "utf8", timeout: 25_000 });
    const status = Number.parseInt(result.stdout?.trim() || "0", 10);
    const headers = headersFromRaw(readFileSync(hdr, "utf8"));
    return { status, location: headers.get("location") ?? null, cfRay: headers.get("cf-ray") ?? null, html: readFileSync(body, "utf8"), error: result.error?.message ?? (result.status ? (result.stderr || "curl error").trim() : null) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function auditOne(example) {
  let url = example.url;
  const hops = [];
  const seen = new Set();
  for (let step = 0; step <= MAX_HOPS; step += 1) {
    firstPartyUrl(url);
    if (seen.has(url)) throw new Error("Redirect cycle at " + url);
    seen.add(url);

    const response = probe(url);
    const hop = { url, status: response.status, location: response.location, cfRay: response.cfRay };
    hops.push(hop);
    console.log("REDIRECT_HOP " + JSON.stringify({ caseId: example.id, hop: step + 1, ...hop }));
    if ([403, 429].includes(response.status)) throw new Error("Circuit breaker: HTTP " + response.status + " for " + url);
    if (response.error || response.status === 0 || response.status >= 500) throw new Error("Origin/transport failure " + response.status + " " + (response.error ?? "") + " " + url);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location) throw new Error("Redirect without Location at " + url);
      if (step === MAX_HOPS) throw new Error("Excessive redirect hops at " + url);
      url = firstPartyUrl(new URL(response.location, url).toString()).toString();
      await wait(REQUEST_GAP_MS);
      continue;
    }

    const expectedStatus = example.expectedStatus ?? 200;
    if (response.status !== expectedStatus) throw new Error("Unexpected final HTTP " + response.status + ", expected " + expectedStatus + " for " + example.id);
    const canonical = response.status === 200 ? canonicalInHtml(response.html) : null;
    if (response.status === 200) {
      if (canonicalPath(url) !== example.expected) throw new Error("Unexpected final path: " + url + " for " + example.id);
      if (canonical !== example.expected && !(example.expected === "https://ilkoku.com/" && canonical === "https://ilkoku.com")) {
        throw new Error("Canonical mismatch for " + example.id + ": " + canonical);
      }
    }

    return { caseId: example.id, start: example.url, finalUrl: url, finalStatus: response.status, canonical, redirects: hops.length - 1, hops };
  }
  throw new Error("Hop limit exhausted");
}

export async function runAudit() {
  const results = [];
  const errors = [];
  for (const example of cases) {
    try {
      const result = await auditOne(example);
      results.push(result);
      console.log("REDIRECT_RESULT " + JSON.stringify({ caseId: result.caseId, redirects: result.redirects, finalStatus: result.finalStatus, finalUrl: result.finalUrl }));
    } catch (error) {
      const failure = { caseId: example.id, error: error instanceof Error ? error.message : String(error) };
      errors.push(failure);
      console.error("REDIRECT_FAILURE " + JSON.stringify(failure));
      if (/Circuit breaker/u.test(failure.error)) break;
    }
    await wait(REQUEST_GAP_MS);
  }
  const report = { measuredAt: new Date().toISOString(), observations: results.length, errors, results };
  writeFileSync(DEST, JSON.stringify(report, null, 2));
  console.log("REDIRECT_AUDIT_SUMMARY " + JSON.stringify({
    checked: results.length, total: cases.length, errors: errors.length,
    worstRedirects: Math.max(0, ...results.map((x) => x.redirects)),
    multiHop: results.filter((x) => x.redirects > 1).map((x) => x.caseId),
  }));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = ["## Madde 18 — raw HTTP redirect chains", "", "| Case | First status | Intermediate statuses | Final | Redirect hops |", "| --- | ---: | --- | --- | ---: |"];
    for (const x of results) lines.push("| " + x.caseId + " | " + x.hops[0].status + " | " + x.hops.map((y) => y.status).join(" → ") + " | " + x.finalStatus + " " + x.finalUrl + " | " + x.redirects + " |");
    lines.push("", "Failures: " + errors.length + ". Statuses and Location headers are recorded in the JSON artifact.", "");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
  }
  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await runAudit();
