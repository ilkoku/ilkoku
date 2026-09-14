import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  parseSiteAnalyticsSettingsStrict,
  validateSiteAnalyticsSettings,
  type SiteAnalyticsSettings,
} from "@/lib/site-analytics-settings";

type Row = { valueJson: string };
type ProbeResult = {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  error?: string;
};

async function loadStoredSettings(): Promise<SiteAnalyticsSettings | null> {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = 'site_analytics' AND contentKey = 'global'
      LIMIT 1
    `;
    const row = rows[0];
    return row ? parseSiteAnalyticsSettingsStrict(row.valueJson) : null;
  } catch {
    return null;
  }
}

async function probe(url: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/javascript,text/javascript,*/*;q=0.1",
        "User-Agent": "IlkOku-Analytics-Verifier/1.0",
      },
    });

    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      contentType: null,
      error: error instanceof Error && error.name === "AbortError" ? "timeout" : "network-error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, state: "forbidden" }, { status: 403 });
  }

  const settings = await loadStoredSettings();
  if (!settings) {
    return NextResponse.json({ ok: false, state: "missing-config" }, { status: 409 });
  }

  const errors = validateSiteAnalyticsSettings(settings);
  if (errors.length > 0) {
    return NextResponse.json({ ok: false, state: "invalid-config", errors }, { status: 409 });
  }

  if (!settings.enabled) {
    return NextResponse.json({
      ok: false,
      state: "disabled",
      consentRequired: settings.consentRequired,
      checks: { config: { ok: true } },
    });
  }

  const [gtm, ga4] = await Promise.all([
    settings.gtmEnabled && settings.gtmId
      ? probe(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(settings.gtmId)}`)
      : Promise.resolve(null),
    settings.ga4Enabled && settings.ga4MeasurementId
      ? probe(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.ga4MeasurementId)}`)
      : Promise.resolve(null),
  ]);

  const providersReachable = [gtm, ga4].every((result) => result === null || result.ok);

  return NextResponse.json(
    {
      ok: providersReachable,
      state: providersReachable ? "google-reachable" : "google-unreachable",
      consentRequired: settings.consentRequired,
      providers: {
        gtm: settings.gtmEnabled,
        ga4: settings.ga4Enabled,
      },
      checks: {
        config: { ok: true },
        gtm,
        ga4,
      },
      note: "Bu kontrol Google tag script uçlarına erişimi doğrular; Google Analytics property sahipliğini veya etkinliğin Google tarafından işlendiğini doğrulamaz.",
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
