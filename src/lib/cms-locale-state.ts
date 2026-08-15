import "server-only";

import { cmsLocales, defaultCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type LocaleRow = {
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
};

export type CmsLocaleState = {
  code: CmsLocaleCode;
  label: string;
  enabled: boolean;
  isDefault: boolean;
};

function parseEnabled(valueJson: string) {
  try {
    const raw = JSON.parse(valueJson) as Record<string, unknown>;
    return raw.enabled === true;
  } catch {
    return false;
  }
}

export async function getCmsLocaleStates(): Promise<CmsLocaleState[]> {
  const rows = await prisma.$queryRaw<LocaleRow[]>`
    SELECT contentKey, valueJson, status
    FROM SiteContent
    WHERE namespace = 'cms_locale'
    LIMIT 20
  `;

  const stateByCode = new Map(
    rows.map((row) => [
      row.contentKey,
      row.status === "published" && parseEnabled(row.valueJson),
    ]),
  );

  return cmsLocales.map((locale) => ({
    ...locale,
    enabled:
      locale.code === defaultCmsLocale
        ? true
        : Boolean(stateByCode.get(locale.code)),
  }));
}

export async function isCmsLocaleEnabledStrict(locale: CmsLocaleCode) {
  if (locale === defaultCmsLocale) return true;
  const states = await getCmsLocaleStates();
  return states.some((state) => state.code === locale && state.enabled);
}

export async function isCmsLocaleEnabled(locale: CmsLocaleCode) {
  if (locale === defaultCmsLocale) return true;
  try {
    return await isCmsLocaleEnabledStrict(locale);
  } catch {
    return false;
  }
}
