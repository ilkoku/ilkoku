"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsPublisher } from "@/lib/cms-access";
import {
  isTrSchedulablePageKey,
  isTrSchedulableSiteNamespace,
  parseCmsSchedulePayload,
  parseIstanbulLocalDateTime,
  runCmsPublishingScheduler,
  type CmsSchedulePayload,
  type CmsScheduleTargetType,
} from "@/lib/cms-scheduler";
import { prisma } from "@/lib/prisma";

type SiteTargetRow = {
  id: string;
  namespace: string;
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
};

type PageTargetRow = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
};

type ScheduleRow = { id: string; contentKey: string; valueJson: string; status: string };

const homepageLabels: Record<string, string> = {
  hero: "Ana Sayfa · Hero",
  roles: "Ana Sayfa · Rol seçimi",
  passport: "Ana Sayfa · Eser Pasaportu",
  why: "Ana Sayfa · Neden İlkOku",
  footer: "Ana Sayfa · Footer",
};

function field(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function targetLabel(row: SiteTargetRow) {
  if (row.namespace === "homepage") return homepageLabels[row.contentKey] ?? `Ana Sayfa · ${row.contentKey}`;
  try {
    const value = JSON.parse(row.valueJson) as Record<string, unknown>;
    if (typeof value.question === "string" && value.question.trim()) return `SSS · ${value.question.trim().slice(0, 120)}`;
  } catch {}
  return `SSS · ${row.contentKey}`;
}

async function readTarget(type: CmsScheduleTargetType, id: string) {
  if (type === "site_content") {
    const rows = await prisma.$queryRaw<SiteTargetRow[]>`
      SELECT id, namespace, contentKey, valueJson, status
      FROM SiteContent
      WHERE id = ${id}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || !isTrSchedulableSiteNamespace(row.namespace)) return null;
    return {
      type,
      id: row.id,
      label: targetLabel(row),
      path: row.namespace === "homepage" ? "/" : "/yardim",
      status: row.status,
    };
  }

  const rows = await prisma.$queryRaw<PageTargetRow[]>`
    SELECT id, contentKey, slug, title, status
    FROM ContentPage
    WHERE id = ${id}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || !isTrSchedulablePageKey(row.contentKey)) return null;
  return { type, id: row.id, label: row.title, path: row.slug, status: row.status };
}

export async function createCmsScheduleAction(formData: FormData) {
  const access = await requireCmsPublisher("/icerik/zamanlama");
  const rawTarget = field(formData, "target", 100);
  const splitAt = rawTarget.indexOf(":");
  if (splitAt <= 0) redirect("/icerik/zamanlama?hata=hedef");

  const rawType = rawTarget.slice(0, splitAt);
  const targetId = rawTarget.slice(splitAt + 1);
  const targetType: CmsScheduleTargetType | null = rawType === "site_content"
    ? "site_content"
    : rawType === "content_page"
      ? "content_page"
      : null;
  if (!targetType || !/^[0-9a-f-]{36}$/i.test(targetId)) redirect("/icerik/zamanlama?hata=hedef");

  const target = await readTarget(targetType, targetId);
  if (!target || target.status === "archived") redirect("/icerik/zamanlama?hata=hedef");

  const publishInput = field(formData, "publishAt", 32);
  const unpublishInput = field(formData, "unpublishAt", 32);
  const publishAt = publishInput ? parseIstanbulLocalDateTime(publishInput) : null;
  const unpublishAt = unpublishInput ? parseIstanbulLocalDateTime(unpublishInput) : null;
  if ((publishInput && !publishAt) || (unpublishInput && !unpublishAt) || (!publishAt && !unpublishAt)) {
    redirect("/icerik/zamanlama?hata=zaman");
  }

  const now = new Date();
  if ((publishAt && publishAt.getTime() <= now.getTime()) || (unpublishAt && unpublishAt.getTime() <= now.getTime())) {
    redirect("/icerik/zamanlama?hata=gelecek");
  }
  if (publishAt && unpublishAt && unpublishAt.getTime() <= publishAt.getTime()) {
    redirect("/icerik/zamanlama?hata=sira");
  }
  if (publishAt && target.status !== "draft") redirect("/icerik/zamanlama?hata=yayin-durumu");
  if (!publishAt && unpublishAt && target.status !== "published") redirect("/icerik/zamanlama?hata=kaldirma-durumu");

  const activeRows = await prisma.$queryRaw<ScheduleRow[]>`
    SELECT id, contentKey, valueJson, status
    FROM SiteContent
    WHERE namespace = 'cms_schedule'
      AND status = 'published'
    ORDER BY createdAt DESC
    LIMIT 500
  `;
  const activePayloads = activeRows.map((row) => parseCmsSchedulePayload(row.valueJson));
  if (activePayloads.some((payload) => !payload)) {
    redirect("/icerik/zamanlama?hata=plan-veri");
  }
  const duplicate = activePayloads.some((payload) => (
    payload?.state === "scheduled"
    && payload.targetType === targetType
    && payload.targetId === targetId
  ));
  if (duplicate) redirect("/icerik/zamanlama?hata=mevcut");

  const id = randomUUID();
  const payload: CmsSchedulePayload = {
    version: 1,
    targetType,
    targetId,
    targetLabel: target.label,
    targetPath: target.path,
    publishAt: publishAt?.toISOString() ?? null,
    unpublishAt: unpublishAt?.toISOString() ?? null,
    timezone: "Europe/Istanbul",
    state: "scheduled",
    createdById: access.user!.id,
    createdAt: now.toISOString(),
  };

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${id}, 'cms_schedule', ${`schedule_${id}`}, ${JSON.stringify(payload)}, 'json', 'published',
      CURRENT_TIMESTAMP(3), ${access.user!.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
  `;

  revalidatePath("/icerik");
  revalidatePath("/icerik/zamanlama");
  redirect(`/icerik/zamanlama?kayit=1&hedef=${encodeURIComponent(rawTarget)}`);
}

export async function cancelCmsScheduleAction(formData: FormData) {
  const access = await requireCmsPublisher("/icerik/zamanlama");
  const contentKey = field(formData, "contentKey", 80);
  if (!/^schedule_[0-9a-f-]{36}$/i.test(contentKey)) return;

  const rows = await prisma.$queryRaw<ScheduleRow[]>`
    SELECT id, contentKey, valueJson, status
    FROM SiteContent
    WHERE namespace = 'cms_schedule'
      AND contentKey = ${contentKey}
      AND status = 'published'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return;
  const payload = parseCmsSchedulePayload(row.valueJson);
  if (!payload || payload.state !== "scheduled") return;

  payload.state = "cancelled";
  payload.cancelledAt = new Date().toISOString();
  await prisma.$executeRaw`
    UPDATE SiteContent
    SET valueJson = ${JSON.stringify(payload)}, status = 'archived',
        updatedById = ${access.user!.id}, updatedAt = CURRENT_TIMESTAMP(3)
    WHERE id = ${row.id}
  `;

  revalidatePath("/icerik");
  revalidatePath("/icerik/zamanlama");
}

export async function runCmsSchedulerNowAction() {
  await requireCmsPublisher("/icerik/zamanlama");
  await runCmsPublishingScheduler();
  revalidatePath("/icerik");
  revalidatePath("/icerik/zamanlama");
  redirect("/icerik/zamanlama?kontrol=1");
}
