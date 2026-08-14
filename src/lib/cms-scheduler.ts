import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type CmsScheduleTargetType = "site_content" | "content_page";
export type CmsScheduleState = "scheduled" | "completed" | "cancelled" | "failed";

export type CmsSchedulePayload = {
  version: 1;
  targetType: CmsScheduleTargetType;
  targetId: string;
  targetLabel: string;
  targetPath: string;
  publishAt: string | null;
  unpublishAt: string | null;
  timezone: "Europe/Istanbul";
  state: CmsScheduleState;
  createdById: string;
  createdAt: string;
  publishedExecutedAt?: string | null;
  unpublishedExecutedAt?: string | null;
  cancelledAt?: string | null;
  failedAt?: string | null;
  failureCode?: string | null;
};

type ScheduleRow = {
  id: string;
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
};

type SiteTargetRow = {
  id: string;
  namespace: string;
  contentKey: string;
  status: "draft" | "published" | "archived";
};

type PageTargetRow = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
};

export function parseIstanbulLocalDateTime(value: string) {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(normalized)) return null;
  const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
  const date = new Date(`${withSeconds}+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseCmsSchedulePayload(valueJson: string): CmsSchedulePayload | null {
  try {
    const value = JSON.parse(valueJson) as Partial<CmsSchedulePayload>;
    if (value.version !== 1) return null;
    if (value.targetType !== "site_content" && value.targetType !== "content_page") return null;
    if (typeof value.targetId !== "string" || !value.targetId) return null;
    if (typeof value.targetLabel !== "string") return null;
    if (typeof value.targetPath !== "string") return null;
    if (typeof value.createdById !== "string" || !value.createdById) return null;
    if (typeof value.createdAt !== "string" || !value.createdAt) return null;
    if (!["scheduled", "completed", "cancelled", "failed"].includes(String(value.state))) return null;

    return {
      version: 1,
      targetType: value.targetType,
      targetId: value.targetId,
      targetLabel: value.targetLabel,
      targetPath: value.targetPath,
      publishAt: typeof value.publishAt === "string" ? value.publishAt : null,
      unpublishAt: typeof value.unpublishAt === "string" ? value.unpublishAt : null,
      timezone: "Europe/Istanbul",
      state: value.state as CmsScheduleState,
      createdById: value.createdById,
      createdAt: value.createdAt,
      publishedExecutedAt: typeof value.publishedExecutedAt === "string" ? value.publishedExecutedAt : null,
      unpublishedExecutedAt: typeof value.unpublishedExecutedAt === "string" ? value.unpublishedExecutedAt : null,
      cancelledAt: typeof value.cancelledAt === "string" ? value.cancelledAt : null,
      failedAt: typeof value.failedAt === "string" ? value.failedAt : null,
      failureCode: typeof value.failureCode === "string" ? value.failureCode : null,
    };
  } catch {
    return null;
  }
}

export function isTrSchedulableSiteNamespace(namespace: string) {
  return namespace === "homepage" || namespace === "faq";
}

export function isTrSchedulablePageKey(contentKey: string) {
  if (contentKey.startsWith("legal:en:") || contentKey.startsWith("guide:en:")) return false;
  return contentKey.startsWith("legal:") || contentKey.startsWith("guide:");
}

async function addScheduledPageRevision(
  page: PageTargetRow,
  actorId: string,
  scheduleKey: string,
  status: "draft" | "published",
  event: "scheduled_publish" | "scheduled_unpublish",
) {
  const versions = await prisma.$queryRaw<Array<{ version: number | bigint }>>`
    SELECT COALESCE(MAX(version), 0) + 1 AS version
    FROM ContentRevision
    WHERE pageId = ${page.id}
  `;
  const version = Number(versions[0]?.version ?? 1);

  let storedBody: Record<string, unknown> = {};
  try {
    storedBody = JSON.parse(page.bodyJson) as Record<string, unknown>;
  } catch {}

  const snapshotJson = JSON.stringify({
    title: page.title,
    ...storedBody,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    canonicalUrl: page.canonicalUrl,
    noIndex: Boolean(page.noIndex),
    status,
    event,
    scheduleKey,
  });

  await prisma.$executeRaw`
    INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
    VALUES (${randomUUID()}, ${page.id}, ${version}, ${snapshotJson}, ${actorId}, CURRENT_TIMESTAMP(3))
  `;
}

async function applySiteTarget(
  payload: CmsSchedulePayload,
  desired: "draft" | "published",
) {
  const rows = await prisma.$queryRaw<SiteTargetRow[]>`
    SELECT id, namespace, contentKey, status
    FROM SiteContent
    WHERE id = ${payload.targetId}
    LIMIT 1
  `;
  const target = rows[0];
  if (!target || !isTrSchedulableSiteNamespace(target.namespace)) {
    return { ok: false as const, code: "SITE_TARGET_NOT_FOUND" };
  }
  if (desired === "published" && target.status === "archived") {
    return { ok: false as const, code: "SITE_TARGET_ARCHIVED" };
  }
  if (target.status === desired || (desired === "draft" && target.status === "archived")) {
    return { ok: true as const, changed: false };
  }

  if (desired === "published") {
    await prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'published', publishedAt = CURRENT_TIMESTAMP(3),
          updatedById = ${payload.createdById}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE id = ${target.id}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'draft', publishedAt = NULL,
          updatedById = ${payload.createdById}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE id = ${target.id}
    `;
  }
  return { ok: true as const, changed: true };
}

async function applyPageTarget(
  payload: CmsSchedulePayload,
  desired: "draft" | "published",
  scheduleKey: string,
) {
  const rows = await prisma.$queryRaw<PageTargetRow[]>`
    SELECT id, contentKey, slug, title, status, bodyJson,
           seoTitle, seoDescription, canonicalUrl, noIndex
    FROM ContentPage
    WHERE id = ${payload.targetId}
    LIMIT 1
  `;
  const target = rows[0];
  if (!target || !isTrSchedulablePageKey(target.contentKey)) {
    return { ok: false as const, code: "PAGE_TARGET_NOT_FOUND" };
  }
  if (desired === "published" && target.status === "archived") {
    return { ok: false as const, code: "PAGE_TARGET_ARCHIVED" };
  }
  if (target.status === desired || (desired === "draft" && target.status === "archived")) {
    return { ok: true as const, changed: false };
  }

  if (desired === "published") {
    await prisma.$executeRaw`
      UPDATE ContentPage
      SET status = 'published', publishedAt = CURRENT_TIMESTAMP(3),
          updatedById = ${payload.createdById}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE id = ${target.id}
    `;
    await addScheduledPageRevision(target, payload.createdById, scheduleKey, "published", "scheduled_publish");
  } else {
    await prisma.$executeRaw`
      UPDATE ContentPage
      SET status = 'draft', publishedAt = NULL,
          updatedById = ${payload.createdById}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE id = ${target.id}
    `;
    await addScheduledPageRevision(target, payload.createdById, scheduleKey, "draft", "scheduled_unpublish");
  }
  return { ok: true as const, changed: true };
}

async function applyTarget(
  payload: CmsSchedulePayload,
  desired: "draft" | "published",
  scheduleKey: string,
) {
  return payload.targetType === "site_content"
    ? applySiteTarget(payload, desired)
    : applyPageTarget(payload, desired, scheduleKey);
}

export async function runCmsPublishingScheduler(now = new Date()) {
  const rows = await prisma.$queryRaw<ScheduleRow[]>`
    SELECT id, contentKey, valueJson, status
    FROM SiteContent
    WHERE namespace = 'cms_schedule'
      AND status = 'published'
    ORDER BY createdAt ASC
    LIMIT 500
  `;

  const result = { processed: 0, published: 0, unpublished: 0, completed: 0, failed: 0 };

  for (const row of rows) {
    const payload = parseCmsSchedulePayload(row.valueJson);
    if (!payload || payload.state !== "scheduled") continue;
    result.processed += 1;

    try {
      const publishDue = payload.publishAt
        && !payload.publishedExecutedAt
        && new Date(payload.publishAt).getTime() <= now.getTime();
      const unpublishDue = payload.unpublishAt
        && !payload.unpublishedExecutedAt
        && new Date(payload.unpublishAt).getTime() <= now.getTime();

      if (publishDue) {
        const applied = await applyTarget(payload, "published", row.contentKey);
        if (!applied.ok) throw new Error(applied.code);
        payload.publishedExecutedAt = now.toISOString();
        if (applied.changed) result.published += 1;
      }

      if (unpublishDue) {
        const applied = await applyTarget(payload, "draft", row.contentKey);
        if (!applied.ok) throw new Error(applied.code);
        payload.unpublishedExecutedAt = now.toISOString();
        if (applied.changed) result.unpublished += 1;
      }

      const publishDone = !payload.publishAt || Boolean(payload.publishedExecutedAt);
      const unpublishDone = !payload.unpublishAt || Boolean(payload.unpublishedExecutedAt);
      const complete = publishDone && unpublishDone;
      if (complete) {
        payload.state = "completed";
        result.completed += 1;
      }

      await prisma.$executeRaw`
        UPDATE SiteContent
        SET valueJson = ${JSON.stringify(payload)},
            status = ${complete ? "archived" : "published"},
            updatedById = ${payload.createdById},
            updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${row.id}
      `;
    } catch (error) {
      payload.state = "failed";
      payload.failedAt = now.toISOString();
      payload.failureCode = error instanceof Error ? error.message.slice(0, 120) : "UNKNOWN_SCHEDULER_ERROR";
      result.failed += 1;

      await prisma.$executeRaw`
        UPDATE SiteContent
        SET valueJson = ${JSON.stringify(payload)}, status = 'archived',
            updatedById = ${payload.createdById}, updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${row.id}
      `;
    }
  }

  return result;
}
