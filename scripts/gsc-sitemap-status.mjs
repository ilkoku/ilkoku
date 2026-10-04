import fs from "node:fs";

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:ilkoku.com";
const SITEMAP_URL = "https://ilkoku.com/sitemap.xml";
const CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GSC_OAUTH_REFRESH_TOKEN;
const OUTPUT_PATH = "/tmp/ilkoku-gsc-sitemap-status.json";

function requireSecret(name, value) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
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

function sitemapEndpoint() {
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
}

async function readSitemapStatus(accessToken) {
  const response = await fetch(sitemapEndpoint(), {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json();

  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    return { found: false, error: message, httpStatus: response.status };
  }

  return {
    found: true,
    path: body.path ?? null,
    lastSubmitted: body.lastSubmitted ?? null,
    lastDownloaded: body.lastDownloaded ?? null,
    isPending: body.isPending ?? null,
    warnings: body.warnings ?? null,
    errors: body.errors ?? null,
    contents: Array.isArray(body.contents)
      ? body.contents.map((entry) => ({
          type: entry.type ?? null,
          submitted: entry.submitted ?? null,
          indexed: entry.indexed ?? null,
        }))
      : [],
  };
}

async function main() {
  requireSecret("GSC_OAUTH_CLIENT_ID", CLIENT_ID);
  requireSecret("GSC_OAUTH_CLIENT_SECRET", CLIENT_SECRET);
  requireSecret("GSC_OAUTH_REFRESH_TOKEN", REFRESH_TOKEN);

  const accessToken = await getAccessToken();
  const status = await readSitemapStatus(accessToken);
  const output = {
    generatedAt: new Date().toISOString(),
    siteUrl: SITE_URL,
    sitemapUrl: SITEMAP_URL,
    status,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));

  if (!status.found && status.httpStatus !== 404) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
