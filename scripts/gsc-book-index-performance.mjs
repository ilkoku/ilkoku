import fs from "node:fs";

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:ilkoku.com";
const CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GSC_OAUTH_REFRESH_TOKEN;
const BOOK_INDEX_PATH = "/en-cok-satanlar";
const PERIOD_DAYS = 28;
const FINAL_DATA_LAG_DAYS = 3;

function requireSecret(name, value) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
}

function formatDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function pacificDateAsUtc(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return new Date(Date.UTC(values.year, values.month - 1, values.day));
}

function shiftDays(date, days) {
  return new Date(date.getTime() + days * 86_400_000);
}

function reportingPeriods(now = new Date()) {
  const pacificToday = pacificDateAsUtc(now);
  const currentEnd = shiftDays(pacificToday, -FINAL_DATA_LAG_DAYS);
  const currentStart = shiftDays(currentEnd, -(PERIOD_DAYS - 1));
  const previousEnd = shiftDays(currentStart, -1);
  const previousStart = shiftDays(previousEnd, -(PERIOD_DAYS - 1));

  return {
    current: {
      startDate: formatDate(currentStart),
      endDate: formatDate(currentEnd),
    },
    previous: {
      startDate: formatDate(previousStart),
      endDate: formatDate(previousEnd),
    },
  };
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

async function querySearchAnalytics(accessToken, period, dimensions = []) {
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        startDate: period.startDate,
        endDate: period.endDate,
        dimensions,
        type: "web",
        dataState: "final",
        aggregationType: "auto",
        rowLimit: dimensions.length ? 250 : 1,
        dimensionFilterGroups: [
          {
            groupType: "and",
            filters: [
              {
                dimension: "page",
                operator: "contains",
                expression: BOOK_INDEX_PATH,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Search Console Search Analytics query failed: ${message}`);
  }

  return Array.isArray(body.rows) ? body.rows : [];
}

function totalFromRows(rows) {
  const row = rows[0];
  return {
    clicks: Number(row?.clicks) || 0,
    impressions: Number(row?.impressions) || 0,
    ctr: Number(row?.ctr) || 0,
    position: Number(row?.position) || 0,
  };
}

function percent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function number(value) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
}

function delta(current, previous) {
  if (previous === 0) return current === 0 ? "0%" : "yeni";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function cleanCell(value) {
  return String(value ?? "—").replaceAll("|", "%7C").replaceAll("\n", " ");
}

function writeSummary({ periods, currentTotals, previousTotals, detailRows }) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;

  const rows = detailRows.slice(0, 25).map((row) => {
    const [page, query] = Array.isArray(row.keys) ? row.keys : [];
    return [
      cleanCell(page),
      cleanCell(query || "(gizli / anonim)"),
      number(Number(row.clicks) || 0),
      number(Number(row.impressions) || 0),
      percent(Number(row.ctr) || 0),
      number(Number(row.position) || 0),
    ].join(" | ");
  });

  const lines = [
    "## Book Index · Google Search organic performance",
    "",
    `Property: \`${SITE_URL}\``,
    `Scope: \`${BOOK_INDEX_PATH}*\``,
    `Current: ${periods.current.startDate} → ${periods.current.endDate}`,
    `Previous: ${periods.previous.startDate} → ${periods.previous.endDate}`,
    "",
    "| Metric | Current 28d | Previous 28d | Change |",
    "| --- | ---: | ---: | ---: |",
    `| Clicks | ${number(currentTotals.clicks)} | ${number(previousTotals.clicks)} | ${delta(currentTotals.clicks, previousTotals.clicks)} |`,
    `| Impressions | ${number(currentTotals.impressions)} | ${number(previousTotals.impressions)} | ${delta(currentTotals.impressions, previousTotals.impressions)} |`,
    `| CTR | ${percent(currentTotals.ctr)} | ${percent(previousTotals.ctr)} | — |`,
    `| Avg. position | ${number(currentTotals.position)} | ${number(previousTotals.position)} | — |`,
    "",
    "### Top Book Index page / query rows",
    "",
    "| Page | Query | Clicks | Impressions | CTR | Avg. position |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...(rows.length ? rows : ["_No finalized Google Search performance rows for Book Index yet._"]),
    "",
    "> Read-only Search Console report. A zero-row result is valid while Book Index is gated, newly published, or has not yet accumulated finalized Search data.",
    "",
  ];

  fs.appendFileSync(path, lines.join("\n"));
}

async function main() {
  requireSecret("GSC_OAUTH_CLIENT_ID", CLIENT_ID);
  requireSecret("GSC_OAUTH_CLIENT_SECRET", CLIENT_SECRET);
  requireSecret("GSC_OAUTH_REFRESH_TOKEN", REFRESH_TOKEN);

  const periods = reportingPeriods();
  const accessToken = await getAccessToken();

  const [
    currentTotalRows,
    previousTotalRows,
    detailRows,
  ] = await Promise.all([
    querySearchAnalytics(accessToken, periods.current),
    querySearchAnalytics(accessToken, periods.previous),
    querySearchAnalytics(accessToken, periods.current, ["page", "query"]),
  ]);

  const currentTotals = totalFromRows(currentTotalRows);
  const previousTotals = totalFromRows(previousTotalRows);

  console.log(JSON.stringify({
    bookIndexSearchPerformance: {
      scope: BOOK_INDEX_PATH,
      periods,
      current: currentTotals,
      previous: previousTotals,
      detailRows: detailRows.slice(0, 25),
    },
  }));

  writeSummary({
    periods,
    currentTotals,
    previousTotals,
    detailRows,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
