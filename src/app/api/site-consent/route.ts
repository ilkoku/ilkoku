import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  defaultSiteConsentSettings,
  parseSiteConsentSettings,
  parseSiteConsentSettingsStrict,
} from "@/lib/site-consent-settings";

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

function redirectToHealth(request: Request, durum: "kaydedildi" | "hata") {
  const url = new URL("/icerik/site-sagligi", request.url);
  url.searchParams.set("durum", durum);
  url.hash = "consent";
  return NextResponse.redirect(url, 303);
}

async function loadStoredSettings() {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = 'site_consent' AND contentKey = 'global'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { settings: defaultSiteConsentSettings, state: "default" as const };
    const settings = parseSiteConsentSettingsStrict(row.valueJson);
    if (!settings) return { settings: defaultSiteConsentSettings, state: "invalid" as const };
    return { settings, state: "stored" as const };
  } catch {
    return { settings: defaultSiteConsentSettings, state: "error" as const };
  }
}

export async function GET() {
  const loaded = await loadStoredSettings();
  const safeSettings = loaded.state === "stored" ? loaded.settings : defaultSiteConsentSettings;

  return NextResponse.json(
    { ok: true, settings: safeSettings, state: loaded.state },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || !sameOrigin(request)) {
    return redirectToHealth(request, "hata");
  }

  const form = await request.formData();
  const raw = JSON.stringify({
    bannerEnabled: form.get("bannerEnabled") === "on",
    analyticsEnabled: form.get("analyticsEnabled") === "on",
    marketingEnabled: form.get("marketingEnabled") === "on",
    consentModeEnabled: form.get("consentModeEnabled") === "on",
    rejectAllEnabled: form.get("rejectAllEnabled") === "on",
    policyPath: String(form.get("policyPath") || defaultSiteConsentSettings.policyPath),
    retentionDays: Number(form.get("retentionDays") || defaultSiteConsentSettings.retentionDays),
  });
  const settings = parseSiteConsentSettings(raw);
  const valueJson = JSON.stringify(settings);
  const id = randomUUID();

  try {
    await prisma.$executeRaw`
      INSERT INTO SiteContent (id, namespace, contentKey, valueJson, valueType, status, createdAt, updatedAt)
      VALUES (${id}, 'site_consent', 'global', ${valueJson}, 'json', 'published', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE valueJson = VALUES(valueJson), status = 'published', updatedAt = CURRENT_TIMESTAMP(3)
    `;
  } catch {
    return redirectToHealth(request, "hata");
  }

  return redirectToHealth(request, "kaydedildi");
}
