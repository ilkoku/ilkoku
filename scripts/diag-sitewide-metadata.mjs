import { writeFileSync } from "node:fs";

const BASE = "https://ilkoku.com";
const UA = "IlkOku-Sitewide-Metadata-Audit/1.0 (+https://ilkoku.com)";
const DELAY_MS = 900;
const timeoutMs = 25000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeUrl = (value) => value.replace(/\/$/, "");

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) {
    out[match[1].toLowerCase()] = match[2];
  }
  return out;
}

function titleValues(source) {
  return [...source.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)]
    .map((match) => match[1].replaceAll("&amp;", "&").replace(/\s+/g, " ").trim());
}

function metaValues(source, name) {
  return [...source.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attrs(match[0]))
    .filter((item) => (item.name ?? "").toLowerCase() === name)
    .map((item) => item.content ?? "");
}

function canonicalValues(source) {
  return [...source.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attrs(match[0]))
    .filter((item) => (item.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"))
    .map((item) => item.href ?? "");
}

function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!value) continue;
    const list = groups.get(value) ?? [];
    list.push(row.url);
    groups.set(value, list);
  }
  return [...groups.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([value, urls]) => ({ value, count: urls.length, urls }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "tr"));
}

async function get(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  return { response, body };
}

const sitemapResponse = await fetch(`${BASE}/sitemap.xml`, {
  headers: { "user-agent": UA, accept: "application/xml,text/xml,*/*" },
  signal: AbortSignal.timeout(timeoutMs),
});
if (!sitemapResponse.ok) throw new Error(`Sitemap HTTP ${sitemapResponse.status}`);
const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
  .map((match) => decodeXml(match[1].trim()))
  .filter((url) => url.startsWith(`${BASE}/`) || url === `${BASE}/`);

console.log(`SITEMAP_URL_COUNT=${urls.length}`);

const rows = [];
for (let index = 0; index < urls.length; index += 1) {
  const url = urls[index];
  let response;
  let body = "";
  let error = null;

  try {
    const result = await get(url);
    response = result.response;
    body = result.body;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  if (response?.status === 403 || response?.status === 429) {
    throw new Error(`Circuit breaker: ${url} returned HTTP ${response.status}`);
  }

  const headMatch = body.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch?.[1] ?? "";
  const titles = titleValues(head);
  const descriptions = metaValues(head, "description");
  const canonicals = canonicalValues(head);
  const robots = metaValues(head, "robots");
  const googlebot = metaValues(head, "googlebot");
  const xRobotsTag = response?.headers.get("x-robots-tag") ?? "";

  const row = {
    url,
    finalUrl: response?.url ?? null,
    status: response?.status ?? null,
    error,
    title: titles[0] ?? "",
    titleCount: titles.length,
    description: descriptions[0] ?? "",
    descriptionCount: descriptions.length,
    canonical: canonicals[0] ?? "",
    canonicalCount: canonicals.length,
    robots,
    googlebot,
    xRobotsTag,
    bytes: Buffer.byteLength(body),
  };
  rows.push(row);

  const statusLabel = row.status ?? "ERR";
  console.log(`[${index + 1}/${urls.length}] ${statusLabel} ${url} | title=${JSON.stringify(row.title)}`);

  await sleep(DELAY_MS);
}

const duplicateTitles = groupBy(rows, "title");
const duplicateDescriptions = groupBy(rows, "description");
const non200 = rows.filter((row) => row.status !== 200);
const missingTitle = rows.filter((row) => !row.title || row.titleCount !== 1);
const missingDescription = rows.filter((row) => !row.description || row.descriptionCount !== 1);
const canonicalIssues = rows.filter((row) => (
  !row.canonical
  || row.canonicalCount !== 1
  || normalizeUrl(row.canonical) !== normalizeUrl(row.url)
));
const noindex = rows.filter((row) => {
  const directives = [...row.robots, ...row.googlebot, row.xRobotsTag].join(",").toLowerCase();
  return directives.includes("noindex");
});
const genericBrandTitle = "İlkOku | Dijital Yazar Platformu – İlk cümle, ilk adım";
const genericBrandDescription = "Yazarları, okuyucuları, editörleri ve yayınevlerini aynı platformda buluşturan dijital yazar ekosistemi.";
const genericTitleUrls = rows.filter((row) => row.title === genericBrandTitle).map((row) => row.url);
const genericDescriptionUrls = rows.filter((row) => row.description === genericBrandDescription).map((row) => row.url);

const report = {
  generatedAt: new Date().toISOString(),
  sitemapUrlCount: urls.length,
  fetchedCount: rows.length,
  non200,
  missingTitle,
  missingDescription,
  canonicalIssues,
  noindex,
  genericBrandTitleCount: genericTitleUrls.length,
  genericBrandTitleUrls: genericTitleUrls,
  genericBrandDescriptionCount: genericDescriptionUrls.length,
  genericBrandDescriptionUrls: genericDescriptionUrls,
  duplicateTitles,
  duplicateDescriptions,
  rows,
};

writeFileSync("metadata-audit.json", JSON.stringify(report, null, 2));

console.log("\n=== SITEWIDE SUMMARY ===");
console.log(JSON.stringify({
  sitemapUrlCount: report.sitemapUrlCount,
  fetchedCount: report.fetchedCount,
  non200Count: non200.length,
  missingTitleCount: missingTitle.length,
  missingDescriptionCount: missingDescription.length,
  canonicalIssueCount: canonicalIssues.length,
  noindexCount: noindex.length,
  genericBrandTitleCount: report.genericBrandTitleCount,
  genericBrandDescriptionCount: report.genericBrandDescriptionCount,
  duplicateTitleGroups: duplicateTitles.map(({ value, count, urls }) => ({ value, count, urls })),
  duplicateDescriptionGroups: duplicateDescriptions.map(({ value, count, urls }) => ({ value, count, urls })),
}, null, 2));
