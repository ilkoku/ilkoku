import "server-only";

import { getCmsDraftState, type CmsDraftState } from "@/lib/cms-drafts";
import type { CmsLocaleCode } from "@/lib/cms-locales";
import {
  parseCmsRoleCardsPayloadStrict,
  roleCardsDraftKey,
  roleCardsNamespace,
  type CmsRoleCardsPayload,
} from "@/lib/cms-role-cards";
import { prisma } from "@/lib/prisma";

type LiveRow = {
  valueJson: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
  publishedAt: Date | null;
};

export type PublishedRoleCardsState =
  | { state: "missing" }
  | { state: "valid"; payload: CmsRoleCardsPayload; updatedAt: Date; publishedAt: Date | null }
  | { state: "corrupt"; updatedAt: Date }
  | { state: "unavailable" };

export type RoleCardsWorkbenchState = {
  live: PublishedRoleCardsState;
  draft: CmsDraftState<CmsRoleCardsPayload> | { state: "unavailable" };
};

export async function getPublishedRoleCardsState(locale: CmsLocaleCode): Promise<PublishedRoleCardsState> {
  const namespace = roleCardsNamespace(locale);
  try {
    const rows = await prisma.$queryRaw<LiveRow[]>`
      SELECT valueJson, status, updatedAt, publishedAt
      FROM SiteContent
      WHERE namespace = ${namespace}
        AND contentKey = 'cards'
        AND status = 'published'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { state: "missing" };
    const payload = parseCmsRoleCardsPayloadStrict(row.valueJson);
    if (!payload) return { state: "corrupt", updatedAt: row.updatedAt };
    return { state: "valid", payload, updatedAt: row.updatedAt, publishedAt: row.publishedAt };
  } catch {
    return { state: "unavailable" };
  }
}

export async function getRoleCardsWorkbenchState(locale: CmsLocaleCode): Promise<RoleCardsWorkbenchState> {
  const [live, draft] = await Promise.all([
    getPublishedRoleCardsState(locale),
    getCmsDraftState<CmsRoleCardsPayload>(roleCardsDraftKey(locale)).catch(() => ({ state: "unavailable" }) as const),
  ]);
  return { live, draft };
}
