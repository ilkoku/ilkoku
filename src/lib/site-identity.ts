import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type SiteIdentity = {
  headerKicker: string;
  defaultEyebrow: string;
  footerTaglineLead: string;
  footerTaglineEmphasis: string;
  logoUrl: string;
  logoAlt: string;
};

export type SiteIdentityLoadState =
  | { state: "ready"; identity: SiteIdentity; firstRun: boolean }
  | { state: "invalid" }
  | { state: "read-error" };

export const defaultSiteIdentity: SiteIdentity = {
  headerKicker: "Dijital yazar platformu",
  defaultEyebrow: "İlkOku",
  footerTaglineLead: "İlk cümle, ilk okurun,",
  footerTaglineEmphasis: "ilk adımın.",
  logoUrl: "",
  logoAlt: "İlkOku",
};

export const cmsMediaLogoPattern = /^\/api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bounded(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

function normalizeLegacyHeaderKicker(value: string) {
  return value.toLocaleLowerCase("tr-TR") === "dijital edebiyat platformu"
    ? defaultSiteIdentity.headerKicker
    : value;
}

export function parseSiteIdentityStrict(valueJson: string): SiteIdentity | null {
  try {
    const value = JSON.parse(valueJson) as Record<string, unknown>;
    const rawHeaderKicker = bounded(value.headerKicker, 100);
    const defaultEyebrow = bounded(value.defaultEyebrow, 60);
    const footerTaglineLead = bounded(value.footerTaglineLead, 120);
    const footerTaglineEmphasis = bounded(value.footerTaglineEmphasis, 80);
    const logoAlt = bounded(value.logoAlt, 120);
    const logoUrl = typeof value.logoUrl === "string" ? value.logoUrl.trim() : "";

    if (!rawHeaderKicker || !defaultEyebrow || !footerTaglineLead || !footerTaglineEmphasis || !logoAlt) return null;
    if (logoUrl && !cmsMediaLogoPattern.test(logoUrl)) return null;

    return {
      headerKicker: normalizeLegacyHeaderKicker(rawHeaderKicker),
      defaultEyebrow,
      footerTaglineLead,
      footerTaglineEmphasis,
      logoUrl,
      logoAlt,
    };
  } catch {
    return null;
  }
}

async function readIdentityRow() {
  const rows = await prisma.$queryRaw<Array<{ valueJson: string }>>`
    SELECT valueJson
    FROM SiteContent
    WHERE namespace = 'site_identity'
      AND contentKey = 'global'
      AND status = 'published'
    LIMIT 1
  `;
  return rows[0]?.valueJson ?? null;
}

export async function loadSiteIdentityForCms(): Promise<SiteIdentityLoadState> {
  try {
    const valueJson = await readIdentityRow();
    if (!valueJson) return { state: "ready", identity: defaultSiteIdentity, firstRun: true };
    const identity = parseSiteIdentityStrict(valueJson);
    return identity ? { state: "ready", identity, firstRun: false } : { state: "invalid" };
  } catch {
    return { state: "read-error" };
  }
}

export const getPublicSiteIdentity = cache(async (): Promise<SiteIdentity> => {
  try {
    const valueJson = await readIdentityRow();
    if (!valueJson) return defaultSiteIdentity;
    return parseSiteIdentityStrict(valueJson) ?? defaultSiteIdentity;
  } catch {
    return defaultSiteIdentity;
  }
});
