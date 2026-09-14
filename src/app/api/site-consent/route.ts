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

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
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
    return NextResponse.json({ ok: false }, { status: 403 });
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
    return NextResponse.redirect(new URL("/icerik/site-sagligi?durum=hata", request.url), 303);
  }

  return NextResponse.redirect(new URL("/icerik/site-sagligi?durum=kaydedildi", request.url), 303);
}
