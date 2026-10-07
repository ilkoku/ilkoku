import fs from "node:fs";

import {
  PRIORITY_QUERY_GROUPS,
  expectedLandingPages,
  queryExpressions,
} from "./seo-priority-query-cohort.mjs";

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:ilkoku.com";
const CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GSC_OAUTH_REFRESH_TOKEN;
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

function escapeRe2(value) {
  return value.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
}

function queryRegex(group) {
  const alternatives = queryExpressions(group)
    .map((query) => escapeRe2(query.trim()))
    .filter(Boolean);
  return `(?i)(${alternatives.join("|")})`;
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

async function querySearchAnalytics(accessToken, period, group, dimensions = []) {
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
                dimension: "query",
                operator: "includingRegex",
                expression: queryRegex(group),
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
    throw new Error(`Search Console Search Analytics query failed for ${group.id}: ${message}`);
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

function normalizePath(pageUrl) {
  try {
    const url = new URL(pageUrl);
    return url.pathname.replace(/\/$/u, "") || "/";
  } catch {
    return "";
  }
}

function classifyDetailRows(group, rows) {
  const expected = new Set(expectedLandingPages(group));
  return rows.map((row) => {
    const [query, page] = Array.isArray(row.keys) ? row.keys : [];
    const path = normalizePath(page);
    return {
      query: query || "",
      page: page || "",
      path,
      expectedLanding: expected.has(path),
      clicks: Number(row.clicks) || 0,
      impressions: Number(row.impressions) || 0,
      ctr: Number(row.ctr) || 0,
      position: Number(row.position) || 0,
    };
  });
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

function writeSummary({ periods, reports }) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;

  const lines = [
    "## İlkOku · Google/Yandex ortak sorgu kohortu",
    "",
    `Property: \`${SITE_URL}\``,
    `Current: ${periods.current.startDate} → ${periods.current.endDate}`,
    `Previous: ${periods.previous.startDate} → ${periods.previous.endDate}`,
    "",
    "| Grup | Tıklama | Gösterim | CTR | Ort. konum | Gösterim değişimi | Beklenmeyen landing satırı |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const report of reports) {
    lines.push(
      `| ${cleanCell(report.label)} | ${number(report.current.clicks)} | ${number(report.current.impressions)} | ${percent(report.current.ctr)} | ${number(report.current.position)} | ${delta(report.current.impressions, report.previous.impressions)} | ${report.unexpectedLandingRows.length} |`,
    );
  }

  for (const report of reports) {
    lines.push(
      "",
      `### ${report.label}`,
      "",
      `Yandex-ready queries: ${report.queries.map((query) => `\`${query}\``).join(", ")}`,
      "",
      `Expected landing pages: ${report.expectedLandingPages.map((page) => `\`${page}\``).join(", ")}`,
      "",
      "| Query | Google landing page | Clicks | Impressions | CTR | Position | Mapping |",
      "| --- | --- | ---: | ---: | ---: | ---: | --- |",
    );

    const detailRows = report.detailRows.slice(0, 25);
    if (detailRows.length === 0) {
      lines.push("_Bu grup için henüz finalized Google Search verisi yok._");
    } else {
      for (const row of detailRows) {
        lines.push(
          `| ${cleanCell(row.query)} | ${cleanCell(row.path || row.page)} | ${number(row.clicks)} | ${number(row.impressions)} | ${percent(row.ctr)} | ${number(row.position)} | ${row.expectedLanding ? "OK" : "KONTROL"} |`,
        );
      }
    }
  }

  lines.push(
    "",
    "> Bu rapor Yandex Webmaster'daki manuel sorgu gruplarının Google Search Console karşılığıdır. Google tarafında kalıcı sorgu grubu nesnesi yoktur; aynı kohort Search Analytics API regex filtreleriyle ölçülür.",
    "",
  );

  fs.appendFileSync(path, lines.join("\n"));
}

async function main() {
  requireSecret("GSC_OAUTH_CLIENT_ID", CLIENT_ID);
  requireSecret("GSC_OAUTH_CLIENT_SECRET", CLIENT_SECRET);
  requireSecret("GSC_OAUTH_REFRESH_TOKEN", REFRESH_TOKEN);

  const periods = reportingPeriods();
  const accessToken = await getAccessToken();
  const reports = [];

  for (const group of PRIORITY_QUERY_GROUPS) {
    const [currentRows, previousRows, detailRows] = await Promise.all([
      querySearchAnalytics(accessToken, periods.current, group),
      querySearchAnalytics(accessToken, periods.previous, group),
      querySearchAnalytics(accessToken, periods.current, group, ["query", "page"]),
    ]);

    const classified = classifyDetailRows(group, detailRows);
    const report = {
      id: group.id,
      label: group.label,
      queries: queryExpressions(group),
      expectedLandingPages: expectedLandingPages(group),
      current: totalFromRows(currentRows),
      previous: totalFromRows(previousRows),
      detailRows: classified,
      unexpectedLandingRows: classified.filter((row) => !row.expectedLanding),
    };
    reports.push(report);
  }

  console.log(JSON.stringify({
    prioritySearchCohortPerformance: {
      siteUrl: SITE_URL,
      periods,
      reports,
    },
  }));

  writeSummary({ periods, reports });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
