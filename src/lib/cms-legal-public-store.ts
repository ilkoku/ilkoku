import "server-only";

import { cmsLegalContentKey, getCmsLegalDocument } from "@/lib/cms-legal";
import type { CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type LegalRow = {
  title: string;
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  updatedAt: Date;
};

export type PublishedLegalDocument = {
  title: string;
  description: string;
  updatedLabel: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  updatedAt: Date;
};

export type PublishedLegalDocumentState =
  | { state: "missing" }
  | { state: "valid"; document: PublishedLegalDocument }
  | { state: "corrupt"; updatedAt: Date }
  | { state: "unavailable" };

function parseBody(valueJson: string) {
  try {
    const raw = JSON.parse(valueJson) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    if (typeof record.body !== "string" || !record.body.trim()) return null;
    return {
      description: typeof record.description === "string" ? record.description.trim() : "",
      updatedLabel: typeof record.updatedLabel === "string" ? record.updatedLabel.trim() : "",
      body: record.body.trim(),
    };
  } catch {
    return null;
  }
}

export async function getPublishedLegalDocumentState(slug: string, locale: CmsLocaleCode): Promise<PublishedLegalDocumentState> {
  const definition = getCmsLegalDocument(slug);
  if (!definition) return { state: "missing" };
  const contentKey = cmsLegalContentKey(definition.slug, locale);

  try {
    const rows = await prisma.$queryRaw<LegalRow[]>`
      SELECT title, bodyJson, seoTitle, seoDescription, canonicalUrl, noIndex, updatedAt
      FROM ContentPage
      WHERE contentKey = ${contentKey}
        AND status = 'published'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { state: "missing" };
    const body = parseBody(row.bodyJson);
    if (!body || !row.title.trim()) return { state: "corrupt", updatedAt: row.updatedAt };

    return {
      state: "valid",
      document: {
        title: row.title.trim(),
        description: body.description || row.seoDescription?.trim() || "",
        updatedLabel: body.updatedLabel,
        body: body.body,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        canonicalUrl: row.canonicalUrl,
        noIndex: row.noIndex,
        updatedAt: row.updatedAt,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
