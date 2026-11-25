import "server-only";

import { cache } from "react";

import { cmsLocaleNamespace, type CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

export const cmsHomepageSectionKeys = ["hero", "roles", "passport", "why", "footer"] as const;
export type CmsHomepageSectionKey = (typeof cmsHomepageSectionKeys)[number];
export type CmsHomepageSection = Record<string, string>;
export type CmsHomepageContent = Partial<Record<CmsHomepageSectionKey, CmsHomepageSection>>;

type PublishedHomepageRow = {
  contentKey: string;
  valueJson: string;
  updatedAt: Date;
};

export type PublishedHomepageState =
  | { state: "missing" }
  | { state: "valid"; content: CmsHomepageContent; updatedAt: Date | null }
  | { state: "corrupt"; section: string; updatedAt: Date | null }
  | { state: "unavailable" };

function parseSection(valueJson: string): CmsHomepageSection | null {
  try {
    const raw = JSON.parse(valueJson) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([key, value]) => [key, value.trim()]),
    );
  } catch {
    return null;
  }
}

// Request-local snapshot shared by the main homepage and its history section.
// Do not cache across requests: publication and preview freshness stay unchanged.
export const getPublishedHomepageRows = cache(async (locale: CmsLocaleCode) => {
  const namespace = cmsLocaleNamespace("homepage", locale);
  return prisma.$queryRaw<PublishedHomepageRow[]>`
    SELECT contentKey, valueJson, updatedAt
    FROM SiteContent
    WHERE namespace = ${namespace}
      AND status = 'published'
  `;
});

export async function getPublishedHomepageState(locale: CmsLocaleCode): Promise<PublishedHomepageState> {
  try {
    const rows = await getPublishedHomepageRows(locale);

    const allowed = new Set<string>(cmsHomepageSectionKeys);
    const relevant = rows.filter((row) => allowed.has(row.contentKey));
    if (relevant.length === 0) return { state: "missing" };

    const content: CmsHomepageContent = {};
    let latest: Date | null = null;
    for (const row of relevant) {
      const parsed = parseSection(row.valueJson);
      if (!parsed) return { state: "corrupt", section: row.contentKey, updatedAt: row.updatedAt };
      content[row.contentKey as CmsHomepageSectionKey] = parsed;
      if (!latest || row.updatedAt > latest) latest = row.updatedAt;
    }

    return { state: "valid", content, updatedAt: latest };
  } catch {
    return { state: "unavailable" };
  }
}
