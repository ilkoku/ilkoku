const SITE = "https://ilkoku.com";
const UA = "IlkOku-Metadata-Census/1.0 (+https://ilkoku.com)";
const DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decode(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) {
    out[match[1].toLowerCase()] = decode(match[2]);
  }
  return out;
}

function titleOf(head) {
  return decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function metaOf(head, name) {
  for (const match of head.matchAll(/<meta\b[^>]*>/gi)) {
    const item = attrs(match[0]);
    if ((item.name ?? "").toLowerCase() === name) return item.content ?? "";
  }
  return "";
}

function canonicalOf(head) {
  for (const match of head.matchAll(/<link\b[^>]*>/gi)) {
    const item = attrs(match[0]);
    if ((item.rel ?? "").toLowerCase().split(/\s+/).includes("canonical")) return item.href ?? "";
  }
  return "";
}

const sitemapResponse = await fetch(`${SITE}/sitemap.xml`, { headers: { "user-agent": UA } });
if (!sitemapResponse.ok) throw new Error(`Sitemap HTTP ${sitemapResponse.status}`);
const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));

const rows = [];
for (let i = 0; i < urls.length; i++) {
  const url = urls[i];
  const response = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (response.status === 403 || response.status === 429) {
    throw new Error(`CIRCUIT_BREAKER ${response.status} ${url} at ${i + 1}/${urls.length}`);
  }

  const html = await response.text();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  rows.push({
    url,
    status: response.status,
    title: titleOf(head),
    description: metaOf(head, "description"),
    canonical: canonicalOf(head),
    robots: metaOf(head, "robots"),
    googlebot: metaOf(head, "googlebot"),
    titleCount: (head.match(/<title\b/gi) ?? []).length,
    descriptionCount: [...head.matchAll(/<meta\b[^>]*>/gi)]
      .map((m) => attrs(m[0]))
      .filter((item) => (item.name ?? "").toLowerCase() === "description").length,
  });

  console.log(`[${i + 1}/${urls.length}] ${response.status} ${url}`);
  if (i + 1 < urls.length) await sleep(DELAY_MS);
}

const groupBy = (key) => {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key] || "(EMPTY)";
    const list = groups.get(value) ?? [];
    list.push(row.url);
    groups.set(value, list);
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([value, list]) => ({ count: list.length, value, urls: list }));
};

const report = {
  sitemapUrlCount: urls.length,
  fetchedCount: rows.length,
  non200: rows.filter((r) => r.status !== 200),
  missingTitle: rows.filter((r) => !r.title).map((r) => r.url),
  duplicateTitleTags: rows.filter((r) => r.titleCount !== 1).map((r) => ({ url: r.url, count: r.titleCount })),
  missingDescription: rows.filter((r) => !r.description).map((r) => r.url),
  duplicateDescriptionTags: rows.filter((r) => r.descriptionCount !== 1).map((r) => ({ url: r.url, count: r.descriptionCount })),
  canonicalMismatch: rows.filter((r) => r.canonical.replace(/\/$/, "") !== r.url.replace(/\/$/, "")).map((r) => ({ url: r.url, canonical: r.canonical })),
  noindexInSitemap: rows.filter((r) => /noindex/i.test(r.robots) || /noindex/i.test(r.googlebot)).map((r) => ({ url: r.url, robots: r.robots, googlebot: r.googlebot })),
  duplicateTitleGroups: groupBy("title"),
  duplicateDescriptionGroups: groupBy("description"),
};

console.log("\n=== METADATA CENSUS REPORT ===");
console.log(JSON.stringify(report, null, 2));
