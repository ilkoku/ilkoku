import fs from "node:fs";
import { spawnSync } from "node:child_process";

const root = "/tmp/ilkoku-live-js-ref-audit";
fs.mkdirSync(root, { recursive: true });
const origin = "https://ilkoku.com";
const routes = [
  "/", "/nasil-calisir", "/yardim", "/iletisim",
  "/yazarlar-icin/kurgu/novella", "/yazarlar-icin/kurgu/oyku",
  "/kitap/belki-bir-gun-okursun-997b2d1f", "/editorler-icin"
];
const oldPath = "/_next/static/chunks/webpack-ac1f19fbd819329e.js";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function probe(url, dest) {
  const args = [
    "-sS", "-L", "--compressed", "--connect-timeout", "8", "--max-time", "28",
    "-A", "IlkOku-Live-JS-Asset-Audit/1.0",
    "-o", dest, "-w", "%{json}", url
  ];
  const result = spawnSync("curl", args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
  let report = {};
  try { report = JSON.parse(result.stdout.trim()); } catch {}
  return {
    http: report.http_code || 0,
    bytes: Number(report.size_download || 0),
    durationMs: Math.round(1000 * Number(report.time_total || 0)),
    error: report.errormsg || result.error?.message || result.stderr.trim() || null
  };
}

let build = null;
const buildFile = root + "/build.json";
const buildHttp = probe(origin + "/api/build-info", buildFile);
if (buildHttp.http === 200) {
  try { build = JSON.parse(fs.readFileSync(buildFile, "utf8")); } catch {}
}

const refs = new Map();
const pages = [];
for (const [index, path] of routes.entries()) {
  const dest = root + "/page-" + index + ".html";
  const result = probe(origin + path, dest);
  if (result.http === 403 || result.http === 429) {
    console.log("WAF circuit breaker at HTML " + path + " HTTP " + result.http);
    process.exitCode = 1;
    break;
  }
  if (result.http !== 200) {
    pages.push({ path, http: result.http, error: result.error, scriptCount: 0 });
    process.exitCode = 1;
    break;
  }
  const html = fs.readFileSync(dest, "utf8");
  const candidates = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/giu), m => m[1]);
  const scripts = candidates.map(candidate => {
    try {
      const u = new URL(candidate.replaceAll("&amp;", "&"), origin);
      return u.origin === origin && u.pathname.startsWith("/_next/static/")
        ? u.pathname + u.search : null;
    } catch { return null; }
  }).filter(Boolean);
  for (const script of scripts) refs.set(script, (refs.get(script) || 0) + 1);
  pages.push({
    path, http: result.http, scriptCount: scripts.length,
    oldWebpackReferenced: html.includes(oldPath)
  });
  console.log("PAGE " + JSON.stringify(pages.at(-1)));
  await sleep(900);
}

const assets = [];
if (!process.exitCode && refs.size > 0 && refs.size <= 90) {
  for (const [path, mentions] of refs) {
    const info = probe(origin + path, "/dev/null");
    assets.push({ path, mentions, ...info });
    console.log("ASSET " + JSON.stringify(assets.at(-1)));
    if (info.http === 403 || info.http === 429) {
      console.log("WAF circuit breaker for assets");
      process.exitCode = 1;
      break;
    }
    await sleep(700);
  }
} else {
  process.exitCode = 1;
}
const historical = probe(origin + oldPath, "/dev/null");
const failures = assets.filter(x => x.http !== 200 || x.bytes <= 0);
const missing = refs.size - assets.length;
const oldReferenced = pages.filter(x => x.oldWebpackReferenced);
const summary = {
  auditedAt: new Date().toISOString(),
  currentBuild: build,
  pageCount: pages.length,
  uniqueCurrentAssetCount: refs.size,
  checkedCurrentAssetCount: assets.length,
  workingCurrentAssetCount: assets.filter(x => x.http === 200 && x.bytes > 0).length,
  badCurrentAssets: failures,
  uncheckedCount: missing,
  oldWebpackReferencedOn: oldReferenced.map(x => x.path),
  oldWebpackHttp: historical.http,
  oldWebpackBytes: historical.bytes,
  pages,
  assets
};
fs.writeFileSync(root + "/report.json", JSON.stringify(summary, null, 2));
const md = [
  "# İlkOku current Next.js JS asset audit",
  "",
  "Eight live HTML routes, unique current JS script references and historical Ahrefs 404.",
  "Ahrefs' 623 links point to one old webpack chunk, not 623 distinct JS files.",
  "",
  "Current build: " + JSON.stringify(build),
  "HTML pages checked: " + pages.length,
  "Unique current scripts: " + refs.size,
  "Current script HTTP 200 with non-empty bodies: " + summary.workingCurrentAssetCount,
  "Broken current scripts: " + failures.length,
  "Unchecked current scripts: " + missing,
  "Historical old webpack HTTP: " + historical.http,
  "Pages still referencing old webpack: " + oldReferenced.map(x => x.path).join(", "),
  "",
  "| Page | HTML | JS references | References old webpack |",
  "|---|---:|---:|---|",
  ...pages.map(x => "| " + [x.path, x.http, x.scriptCount, x.oldWebpackReferenced ? "YES" : "No"].join(" | ") + " |"),
  "",
  "This read-only runner audit cannot disprove stale cached HTML, open tabs, or user device errors during releases."
].join("\n");
fs.writeFileSync(root + "/report.md", md);
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
if (failures.length || missing || oldReferenced.length) process.exitCode = 1;
