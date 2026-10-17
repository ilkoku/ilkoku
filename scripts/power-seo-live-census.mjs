import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ORIGIN = "https://ilkoku.com";
const MAX_URLS = 400;
const MAX_HTML_BYTES = 1_500_000;
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 2;

function decodeEntity(value) {
  return value.replace(/&amp;/gu, "&").replace(/&quot;/gu, '"').replace(/&#39;/gu, "'");
}

function attribute(tag, name) {
  const result = new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "iu").exec(tag);
  return result ? decodeEntity(result[2]).trim() : "";
}

function canonicalFromHtml(html) {
  for (const tag of html.match(/<link\b[^>]*>/giu) || []) {
    if (attribute(tag, "rel").toLowerCase().split(/\s+/u).includes("canonical")) {
      return attribute(tag, "href");
    }
  }
  return "";
}

function robotsFromHtml(html) {
  for (const tag of html.match(/<meta\b[^>]*>/giu) || []) {
    if (attribute(tag, "name").toLowerCase() === "robots") return attribute(tag, "content");
  }
  return "";
}

function normalize(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === ORIGIN
      ? (parsed.origin + parsed.pathname.replace(/\/+$/u, "")).toLowerCase()
      : "";
  } catch {
    return "";
  }
}

async function read(url, limit) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "IlkOku-PowerSEO-LiveCensus/1.0" },
  });
  const bytes = Number(response.headers.get("content-length") || 0);
  if (bytes > limit) throw new Error("Response content-length exceeds safety limit");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > limit) throw new Error("Response exceeds safety limit");
  return { response, body: new TextDecoder().decode(buffer) };
}

function parseSitemap(xml) {
  if (!/<urlset(?:\s|>)/iu.test(xml)) throw new Error("Expected sitemap urlset");
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/giu)].map((match) => {
    const raw = /<loc>\s*([^<]+)\s*<\/loc>/iu.exec(match[1])?.[1];
    if (!raw) throw new Error("Sitemap entry lacks loc");
    const url = new URL(decodeEntity(raw));
    if (url.origin !== ORIGIN || url.search || url.hash || url.username || url.password) {
      throw new Error("Sitemap contains an unsafe/off-origin URL");
    }
    return url.toString();
  });
  if (urls.length < 120 || urls.length > MAX_URLS || new Set(urls).size !== urls.length) {
    throw new Error("Unexpected incomplete, duplicate or oversized sitemap: " + urls.length);
  }
  return urls;
}

async function inspect(url) {
  try {
    const { response, body } = await read(url, MAX_HTML_BYTES);
    const ok = response.status === 200 &&
      (response.headers.get("content-type") || "").toLowerCase().includes("text/html");
    const canonical = ok ? canonicalFromHtml(body) : "";
    const robots = ok ? robotsFromHtml(body) : "";
    const title = ok ? /<title[^>]*>([\s\S]*?)<\/title>/iu.exec(body)?.[1]?.replace(/<[^>]+>/gu, " ").trim().slice(0, 170) || "" : "";
    return {
      url, status: response.status, ok, title, canonical, robots,
      canonicalMatches: !!canonical && normalize(canonical) === normalize(url),
      error: ok ? "" : "Not HTTP 200 HTML",
    };
  } catch (e) {
    return { url, status: null, ok: false, title: "", canonical: "", robots: "",
      canonicalMatches: false, error: e instanceof Error ? e.name : "Unknown error" };
  }
}

async function main() {
  const { response, body } = await read(ORIGIN + "/sitemap.xml", 1_500_000);
  if (response.status !== 200 || !(response.headers.get("content-type") || "").includes("xml")) {
    throw new Error("Live sitemap not HTTP 200 XML");
  }
  const urls = parseSitemap(body);
  const results = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    results.push(...await Promise.all(urls.slice(i, i + CONCURRENCY).map(inspect)));
    await new Promise((done) => setTimeout(done, 120));
  }
  const summary = {
    sitemapCount: urls.length,
    successfulHtml: results.filter((x) => x.ok).length,
    errors: results.filter((x) => !x.ok).length,
    canonicalMatches: results.filter((x) => x.canonicalMatches).length,
    canonicalMissingOrDifferent: results.filter((x) => x.ok && !x.canonicalMatches).length,
    noindexPagesInSitemap: results.filter((x) => /\bnoindex\b/iu.test(x.robots)).length,
    scope: "Live sitemap-only census; not Google index status or complete internal-link graph",
  };
  const report = { checkedAt: new Date().toISOString(), origin: ORIGIN, summary, results };
  const file = path.join(process.cwd(), "artifacts", "power-seo-live-census.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(summary));
  for (const page of results.filter((x) => !x.ok || !x.canonicalMatches || /\bnoindex\b/iu.test(x.robots))) {
    console.log(JSON.stringify(page));
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      "## Power-SEO read-only live sitemap census",
      "",
      "| Metric | Count |",
      "| --- | ---: |",
      ...Object.entries(summary).filter(([,value]) => typeof value === "number").map(([k,v]) => "| " + k + " | " + v + " |"),
      "",
      "> Sitemap-only diagnostics, not a Search Console index claim. Full per-page evidence is in the uploaded JSON artifact.",
      "",
    ].join("\n"));
  }
  if (summary.errors || summary.canonicalMissingOrDifferent || summary.noindexPagesInSitemap) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Live census failed");
    process.exitCode = 1;
  });
}
