import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  defaultSiteAnalyticsSettings,
  parseSiteAnalyticsSettings,
  parseSiteAnalyticsSettingsStrict,
  validateSiteAnalyticsSettings,
} from "@/lib/site-analytics-settings";

type Row = { valueJson: string };

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function sameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const publicHost =
      firstForwardedValue(request.headers.get("x-forwarded-host")) ||
      request.headers.get("host") ||
      new URL(request.url).host;
    return originHost === publicHost;
  } catch {
    return false;
  }
}

function getPublicOrigin(request: Request) {
  for (const candidate of [process.env.NEXT_PUBLIC_SITE_URL, process.env.SITE_URL]) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.hostname !== "0.0.0.0" && parsed.hostname !== "localhost") return parsed.origin;
    } catch {
      // Ignore malformed environment URL and continue to proxy headers.
    }
  }

  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  if (forwardedHost && forwardedHost !== "0.0.0.0:3000") {
    return `${forwardedProto === "http" ? "http" : "https"}://${forwardedHost}`;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.hostname !== "0.0.0.0" && parsed.hostname !== "localhost") return parsed.origin;
    } catch {
      // Ignore and fall through.
    }
  }

  const host = request.headers.get("host");
  if (host && host !== "0.0.0.0:3000") return `https://${host}`;
  return "https://ilkoku.com";
}

function redirectToHealth(request: Request, durum: "kaydedildi" | "hata") {
  const url = new URL("/icerik/site-sagligi", getPublicOrigin(request));
  url.searchParams.set("analytics", durum);
  url.hash = "analytics";
  return NextResponse.redirect(url, 303);
}

async function loadStoredSettings() {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = 'site_analytics' AND contentKey = 'global'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { settings: defaultSiteAnalyticsSettings, state: "default" as const };
    const settings = parseSiteAnalyticsSettingsStrict(row.valueJson);
    if (!settings) return { settings: defaultSiteAnalyticsSettings, state: "invalid" as const };
    return { settings, state: "stored" as const };
  } catch {
    return { settings: defaultSiteAnalyticsSettings, state: "error" as const };
  }
}

export async function GET() {
  const loaded = await loadStoredSettings();
  const safeSettings = loaded.state === "stored" ? loaded.settings : defaultSiteAnalyticsSettings;
  return NextResponse.json(
    { ok: true, settings: safeSettings, state: loaded.state },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || !sameOrigin(request)) return redirectToHealth(request, "hata");

  const form = await request.formData();
  const raw = JSON.stringify({
    enabled: form.get("enabled") === "on",
    gtmEnabled: form.get("gtmEnabled") === "on",
    ga4Enabled: form.get("ga4Enabled") === "on",
    gtmId: String(form.get("gtmId") || ""),
    ga4MeasurementId: String(form.get("ga4MeasurementId") || ""),
    consentRequired: form.get("consentRequired") === "on",
    debugMode: form.get("debugMode") === "on",
  });

  const settings = parseSiteAnalyticsSettings(raw);
  if (validateSiteAnalyticsSettings(settings).length > 0) return redirectToHealth(request, "hata");

  const valueJson = JSON.stringify(settings);
  const id = randomUUID();
  try {
    await prisma.$executeRaw`
      INSERT INTO SiteContent (id, namespace, contentKey, valueJson, valueType, status, createdAt, updatedAt)
      VALUES (${id}, 'site_analytics', 'global', ${valueJson}, 'json', 'published', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE valueJson = VALUES(valueJson), status = 'published', updatedAt = CURRENT_TIMESTAMP(3)
    `;
  } catch {
    return redirectToHealth(request, "hata");
  }

  return redirectToHealth(request, "kaydedildi");
}
