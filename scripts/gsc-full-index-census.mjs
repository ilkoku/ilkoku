import fs from "node:fs";

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:ilkoku.com";
const CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GSC_OAUTH_REFRESH_TOKEN;

const BASE_URL = "https://ilkoku.com";
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const OUTPUT_PATH = "/tmp/ilkoku-gsc-full-index-census.json";
const MAX_URLS = 500;
const CONCURRENCY = 6;
const SITEMAP_MAX_BYTES = 50 * 1024 * 1024;

function requireSecret(name, value) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
}

function validateUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "ilkoku.com") {
    throw new Error(`Unexpected sitemap URL: ${value}`);
  }
  return url.toString();
}

async function loadSitemapUrls() {
  const response = await fetch(SITEMAP_URL, {
    headers: {
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "user-agent": "IlkOku-GSC-Census/1.0",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Sitemap fetch failed: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const bytes = Buffer.byteLength(xml, "utf8");
  if (bytes > SITEMAP_MAX_BYTES) {
    throw new Error(`Sitemap exceeds 50 MB: ${bytes} bytes`);
  }

  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/giu)]
    .map((match) => validateUrl(match[1].trim()));

  if (locations.length === 0) throw new Error("Sitemap contains no URLs");
  if (locations.length > MAX_URLS) {
    throw new Error(`Refusing census larger than ${MAX_URLS} URLs: ${locations.length}`);
  }

  const unique = [...new Set(locations)];
  if (unique.length !== locations.length) {
    throw new Error(`Sitemap contains ${locations.length - unique.length} duplicate URL(s)`);
  }

  console.log(`Census sitemap: ${unique.length} URL(s), ${bytes} byte(s)`);
  return unique;
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
    return {
      inspectionUrl,
      error: message,
    };
  }

  const result = body?.inspectionResult?.indexStatusResult;
  if (!result || typeof result !== "object") {
    return {
      inspectionUrl,
      error: "Missing indexStatusResult",
    };
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

async function inspectAll(accessToken, urls) {
  const results = new Array(urls.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= urls.length) return;

      const result = await inspectUrl(accessToken, urls[index]);
      results[index] = result;

      console.log(JSON.stringify({
        censusIndex: index + 1,
        censusTotal: urls.length,
        ...result,
      }));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker()),
  );

  return results;
}

function countBy(results, key) {
  const counts = new Map();
  for (const result of results) {
    const value = result.error ? "ERROR" : (result[key] ?? "UNSPECIFIED");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

function newestCrawl(results) {
  const dated = results
    .filter((item) => item.lastCrawlTime)
    .map((item) => new Date(item.lastCrawlTime))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dated[0]?.toISOString() ?? null;
}

function writeStepSummary(payload) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const coverageRows = Object.entries(payload.summary.coverageState)
    .map(([state, count]) => `| ${state.replaceAll("|", "%7C")} | ${count} |`);

  const lines = [
    "## GSC full index census",
    "",
    `Live sitemap URLs: **${payload.summary.totalUrls}**`,
    `Errors: **${payload.summary.errors}**`,
    `Newest Google crawl in census: **${payload.summary.newestCrawl ?? "—"}**`,
    "",
    "### Coverage states",
    "",
    "| Coverage state | Count |",
    "| --- | ---: |",
    ...coverageRows,
    "",
    "> Read-only census using Google's URL Inspection API. No indexing request or Search Console mutation is performed.",
    "",
  ];

  fs.appendFileSync(summaryPath, lines.join("\n"));
}

async function main() {
  requireSecret("GSC_OAUTH_CLIENT_ID", CLIENT_ID);
  requireSecret("GSC_OAUTH_CLIENT_SECRET", CLIENT_SECRET);
  requireSecret("GSC_OAUTH_REFRESH_TOKEN", REFRESH_TOKEN);

  const urls = await loadSitemapUrls();
  const accessToken = await getAccessToken();
  const results = await inspectAll(accessToken, urls);

  const payload = {
    generatedAt: new Date().toISOString(),
    siteUrl: SITE_URL,
    sitemapUrl: SITEMAP_URL,
    summary: {
      totalUrls: results.length,
      errors: results.filter((item) => item.error).length,
      coverageState: countBy(results, "coverageState"),
      verdict: countBy(results, "verdict"),
      robotsTxtState: countBy(results, "robotsTxtState"),
      pageFetchState: countBy(results, "pageFetchState"),
      indexingState: countBy(results, "indexingState"),
      newestCrawl: newestCrawl(results),
    },
    results,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  writeStepSummary(payload);

  console.log("GSC census summary:");
  console.log(JSON.stringify(payload.summary));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
