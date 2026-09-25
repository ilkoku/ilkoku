import fs from "node:fs";

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:ilkoku.com";
const CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GSC_OAUTH_REFRESH_TOKEN;
const MAX_URLS = 10;
const BASE_URL = "https://ilkoku.com";

function requireSecret(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function parseRequestedUrls(value) {
  if (!value?.trim()) return [];
  return [...new Set(
    value
      .split(/[\n,]/u)
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

function validateInspectionUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "ilkoku.com") {
    throw new Error(`Inspection URL must be an https://ilkoku.com URL: ${value}`);
  }
  if (url.username || url.password) {
    throw new Error(`Inspection URL must not contain credentials: ${value}`);
  }
  return url.toString();
}

async function discoverRepresentativeWorkUrl() {
  try {
    const response = await fetch(`${BASE_URL}/sitemap.xml`, {
      headers: {
        accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
        "user-agent": "IlkOku-GSC-Inspection/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const xml = await response.text();
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/giu)]
      .map((match) => match[1].trim());
    return locations.find((location) => /^https:\/\/ilkoku\.com\/kitap\//u.test(location)) || null;
  } catch {
    return null;
  }
}

async function getAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const body = await response.json();
  if (!response.ok || typeof body.access_token !== "string") {
    const message = body.error_description || body.error || `HTTP ${response.status}`;
    throw new Error(`Google OAuth token exchange failed: ${message}`);
  }
  return body.access_token;
}

async function listSitemaps(accessToken) {
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(20_000),
    },
  );

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Search Console sitemap list failed: ${message}`);
  }

  return (Array.isArray(body.sitemap) ? body.sitemap : []).map((item) => ({
    path: item.path ?? null,
    lastSubmitted: item.lastSubmitted ?? null,
    isPending: item.isPending ?? null,
    isSitemapsIndex: item.isSitemapsIndex ?? null,
    type: item.type ?? null,
    lastDownloaded: item.lastDownloaded ?? null,
    warnings: item.warnings ?? null,
    errors: item.errors ?? null,
    contents: Array.isArray(item.contents)
      ? item.contents.map((entry) => ({
          type: entry.type ?? null,
          submitted: entry.submitted ?? null,
          indexed: entry.indexed ?? null,
        }))
      : [],
  }));
}

function sitemapTotals(item) {
  return item.contents.reduce(
    (totals, entry) => ({
      submitted: totals.submitted + (Number(entry.submitted) || 0),
      indexed: totals.indexed + (Number(entry.indexed) || 0),
    }),
    { submitted: 0, indexed: 0 },
  );
}

async function inspectUrl(accessToken, inspectionUrl) {
  const response = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl,
        siteUrl: SITE_URL,
        languageCode: "tr-TR",
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw new Error(`URL Inspection failed for ${inspectionUrl}: ${message}`);
  }

  const result = body?.inspectionResult?.indexStatusResult;
  if (!result || typeof result !== "object") {
    throw new Error(`URL Inspection returned no indexStatusResult for ${inspectionUrl}`);
  }

  return {
    inspectionUrl,
    verdict: result.verdict ?? null,
    coverageState: result.coverageState ?? null,
    robotsTxtState: result.robotsTxtState ?? null,
    indexingState: result.indexingState ?? null,
    pageFetchState: result.pageFetchState ?? null,
    lastCrawlTime: result.lastCrawlTime ?? null,
    userCanonical: result.userCanonical ?? null,
    googleCanonical: result.googleCanonical ?? null,
    crawledAs: result.crawledAs ?? null,
    sitemap: Array.isArray(result.sitemap) ? result.sitemap : [],
    referringUrls: Array.isArray(result.referringUrls) ? result.referringUrls : [],
  };
}

function writeStepSummary(results, sitemaps) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;

  const sitemapRows = sitemaps.map((item) => {
    const totals = sitemapTotals(item);
    return [
      item.path ?? "—",
      item.lastSubmitted ?? "—",
      item.lastDownloaded ?? "—",
      item.isPending === null ? "—" : String(item.isPending),
      item.errors ?? "—",
      item.warnings ?? "—",
      totals.submitted,
      totals.indexed,
    ].join(" | ");
  });

  const lines = [
    "## Google Search Console URL Inspection",
    "",
    `Property: \`${SITE_URL}\``,
    "",
    "### Sitemap status",
    "",
    "| Path | Last submitted | Last downloaded | Pending | Errors | Warnings | Submitted | Indexed |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...(sitemapRows.length > 0 ? sitemapRows : ["_No sitemap returned by Search Console._"]),
    "",
    "| URL | Verdict | Coverage | Robots | Indexing | Fetch | Last crawl | Google canonical | User canonical |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...results.map((item) => [
      `\`${item.inspectionUrl.replaceAll("|", "%7C")}\``,
      item.verdict ?? "—",
      item.coverageState ?? "—",
      item.robotsTxtState ?? "—",
      item.indexingState ?? "—",
      item.pageFetchState ?? "—",
      item.lastCrawlTime ?? "—",
      item.googleCanonical ?? "—",
      item.userCanonical ?? "—",
    ].join(" | ")),
    "",
    "> Diagnostic only. This workflow reads Google's indexed-version status; it does not request indexing or change Search Console state.",
    "",
  ];

  fs.appendFileSync(path, lines.join("\n"));
}

async function main() {
  requireSecret("GSC_OAUTH_CLIENT_ID", CLIENT_ID);
  requireSecret("GSC_OAUTH_CLIENT_SECRET", CLIENT_SECRET);
  requireSecret("GSC_OAUTH_REFRESH_TOKEN", REFRESH_TOKEN);

  const requested = parseRequestedUrls(process.env.GSC_INSPECTION_URLS);
  const defaults = [
    `${BASE_URL}/`,
    `${BASE_URL}/nasil-calisir`,
    `${BASE_URL}/yazarlar-icin`,
    `${BASE_URL}/yazarlar-icin/kurgu/roman`,
  ];

  const representativeWork = requested.length === 0
    ? await discoverRepresentativeWorkUrl()
    : null;

  const urls = [...new Set(
    (requested.length > 0 ? requested : [...defaults, representativeWork].filter(Boolean))
      .map(validateInspectionUrl),
  )];

  if (urls.length === 0) throw new Error("No inspection URLs were selected.");
  if (urls.length > MAX_URLS) {
    throw new Error(`Refusing to inspect more than ${MAX_URLS} URLs in one diagnostic run.`);
  }

  console.log(`GSC property: ${SITE_URL}`);
  console.log(`Inspection cohort: ${urls.length} URL(s)`);

  const accessToken = await getAccessToken();
  const sitemaps = await listSitemaps(accessToken);
  console.log(`GSC sitemaps: ${sitemaps.length}`);
  for (const sitemap of sitemaps) {
    console.log(JSON.stringify({ searchConsoleSitemap: sitemap }));
  }

  const results = [];
  for (const inspectionUrl of urls) {
    const result = await inspectUrl(accessToken, inspectionUrl);
    results.push(result);
    console.log(JSON.stringify(result));
  }

  writeStepSummary(results, sitemaps);
  console.log(`Completed ${results.length} URL Inspection request(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
