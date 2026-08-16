import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { CmsLocaleCode } from "@/lib/cms-locales";

export const CMS_DRAFT_NAMESPACE = "cms_draft";

export type CmsDraftRecord<T extends Record<string, unknown> = Record<string, unknown>> = {
  contentKey: string;
  payload: T;
  updatedAt: Date;
};

type DraftRow = {
  contentKey: string;
  valueJson: string;
  updatedAt: Date;
};

function parsePayload<T extends Record<string, unknown>>(valueJson: string): T | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as T;
  } catch {
    return null;
  }
}

export function homepageDraftKey(locale: CmsLocaleCode, section: string) {
  return `homepage:${locale}:${section}`;
}

export function pageDraftKey(pageId: string) {
  return `page:${pageId}`;
}

export function faqDraftKey(locale: CmsLocaleCode, contentKey: string) {
  return `faq:${locale}:${contentKey}`;
}

export async function getCmsDraft<T extends Record<string, unknown>>(contentKey: string): Promise<CmsDraftRecord<T> | null> {
  const rows = await prisma.$queryRaw<DraftRow[]>`
    SELECT contentKey, valueJson, updatedAt
    FROM SiteContent
    WHERE namespace = ${CMS_DRAFT_NAMESPACE}
      AND contentKey = ${contentKey}
      AND status = 'draft'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const payload = parsePayload<T>(row.valueJson);
  return payload ? { contentKey: row.contentKey, payload, updatedAt: row.updatedAt } : null;
}

export async function getCmsDraftsByPrefix<T extends Record<string, unknown>>(prefix: string): Promise<CmsDraftRecord<T>[]> {
  const like = `${prefix}%`;
  const rows = await prisma.$queryRaw<DraftRow[]>`
    SELECT contentKey, valueJson, updatedAt
    FROM SiteContent
    WHERE namespace = ${CMS_DRAFT_NAMESPACE}
      AND contentKey LIKE ${like}
      AND status = 'draft'
    ORDER BY updatedAt DESC
  `;
  return rows.flatMap((row) => {
    const payload = parsePayload<T>(row.valueJson);
    return payload ? [{ contentKey: row.contentKey, payload, updatedAt: row.updatedAt }] : [];
  });
}

export async function saveCmsDraft(userId: string, contentKey: string, payload: Record<string, unknown>) {
  const valueJson = JSON.stringify(payload);
  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${CMS_DRAFT_NAMESPACE}, ${contentKey}, ${valueJson}, 'json', 'draft',
      ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = 'draft',
      publishedAt = NULL,
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;
}

export async function deleteCmsDraft(contentKey: string) {
  await prisma.$executeRaw`
    DELETE FROM SiteContent
    WHERE namespace = ${CMS_DRAFT_NAMESPACE}
      AND contentKey = ${contentKey}
  `;
}
