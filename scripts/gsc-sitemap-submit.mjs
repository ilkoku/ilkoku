const SITE_URL = "sc-domain:ilkoku.com";
const SITEMAP_URL = "https://ilkoku.com/sitemap.xml";
const WRITE_SCOPE = "https://www.googleapis.com/auth/webmasters";
const CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET;
const WRITE_REFRESH_TOKEN = process.env.GSC_OAUTH_WRITE_REFRESH_TOKEN;
const MAX_SITEMAP_BYTES = 50 * 1024 * 1024;
const DISCOVERY_TARGETS = [
  "https://ilkoku.com/",
  "https://ilkoku.com/nasil-calisir",
  "https://ilkoku.com/hakkimizda",
  "https://ilkoku.com/yazarlar-icin",
  "https://ilkoku.com/okurlar-icin",
  "https://ilkoku.com/editorler-icin",
  "https://ilkoku.com/yayinevleri-icin",
  "https://ilkoku.com/editoryal-standartlar",
  "https://ilkoku.com/yazarlar-icin/kurgu/roman",
  "https://ilkoku.com/okurlar-icin/okumaya-baslama",
  "https://ilkoku.com/editorler-icin/egitim/editorluge-baslama",
];

function requireSecret(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

async function validateLiveSitemap() {
  const response = await fetch(SITEMAP_URL, {
    headers: {
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "user-agent": "IlkOku-GSC-Sitemap-Submit/1.0",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Live sitemap fetch failed: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const bytes = Buffer.byteLength(xml, "utf8");
  if (bytes > MAX_SITEMAP_BYTES) {
    throw new Error(`Live sitemap exceeds 50 MB: ${bytes} bytes`);
  }

  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/giu)]
    .map((match) => match[1].trim());
  const uniqueLocations = new Set(locations);

  if (locations.length === 0) {
    throw new Error("Live sitemap contains no <loc> entries");
  }
  if (uniqueLocations.size !== locations.length) {
    throw new Error("Live sitemap contains duplicate <loc> entries");
  }

  const missingTargets = DISCOVERY_TARGETS.filter((url) => !uniqueLocations.has(url));
  if (missingTargets.length > 0) {
    throw new Error(`Discovery target missing from live sitemap: ${missingTargets.join(", ")}`);
  }

  console.log(`Live sitemap validated: ${locations.length} URL(s), ${bytes} byte(s)`);
}

async function getAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: WRITE_REFRESH_TOKEN,
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

async function getGrantedScopes(accessToken) {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      { signal: AbortSignal.timeout(20_000) },
    );
    const body = await response.json();
    if (!response.ok) {
      throw new Error("tokeninfo rejected the access token");
    }

    return String(body.scope ?? "")
      .split(/\s+/u)
      .map((scope) => scope.trim())
      .filter(Boolean)
      .sort();
  } catch {
    throw new Error("Google OAuth token scope introspection failed");
  }
}

function sitemapEndpoint() {
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
}

async function submitSitemap(accessToken) {
  const response = await fetch(sitemapEndpoint(), {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body?.error?.message || message;
    } catch {
      // Keep the HTTP-only error.
    }
    throw new Error(`Search Console sitemap submit failed: ${message}`);
  }
}

async function readSitemapStatus(accessToken) {
  const response = await fetch(sitemapEndpoint(), {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(20_000),
  });

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Search Console sitemap verification failed: ${message}`);
  }

  return {
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
  requireSecret("GSC_OAUTH_WRITE_REFRESH_TOKEN", WRITE_REFRESH_TOKEN);

  await validateLiveSitemap();

  const accessToken = await getAccessToken();
  const grantedScopes = await getGrantedScopes(accessToken);
  console.log(`GSC write OAuth granted scopes: ${grantedScopes.join(" ") || "UNSPECIFIED"}`);

  if (!grantedScopes.includes(WRITE_SCOPE)) {
    throw new Error(`Write token is missing required scope: ${WRITE_SCOPE}`);
  }

  await submitSitemap(accessToken);
  const status = await readSitemapStatus(accessToken);
  console.log(JSON.stringify({ searchConsoleSitemapAfterSubmit: status }));
  console.log(`Submitted sitemap to Google Search Console: ${SITEMAP_URL}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
