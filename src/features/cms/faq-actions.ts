"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCmsAccess, requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import {
  cmsLocaleNamespace,
  cmsLocalePublicPath,
  normalizeCmsLocale,
  type CmsLocaleCode,
} from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type FaqStatus = "draft" | "published" | "archived";
type FaqRow = { contentKey: string; valueJson: string; status: FaqStatus };
type FaqPayload = {
  id: string;
  question: string;
  answer: string;
  category: string;
  audience: "all" | "reader" | "writer" | "editor" | "publisher";
  position: number;
};

const audiences = new Set<FaqPayload["audience"]>(["all", "reader", "writer", "editor", "publisher"]);

function field(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function localeFromForm(formData: FormData) {
  return normalizeCmsLocale(field(formData, "locale", 8));
}

function normalizeAudience(value: string): FaqPayload["audience"] {
  return audiences.has(value as FaqPayload["audience"])
    ? (value as FaqPayload["audience"])
    : "all";
}

function normalizePosition(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(parsed, 9999));
}

function parsePayload(valueJson: string): Partial<FaqPayload> {
  try { return JSON.parse(valueJson) as Partial<FaqPayload>; } catch { return {}; }
}

async function getFaq(contentKey: string, locale: CmsLocaleCode) {
  if (!contentKey.startsWith("item_")) return null;
  const namespace = cmsLocaleNamespace("faq", locale);
  const rows = await prisma.$queryRaw<FaqRow[]>`
    SELECT contentKey, valueJson, status
    FROM SiteContent
    WHERE namespace = ${namespace}
      AND contentKey = ${contentKey}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function refreshFaq(locale: CmsLocaleCode) {
  revalidatePath("/icerik/sss");
  revalidatePath(cmsLocalePublicPath("/yardim", locale));
}

export async function saveFaqAction(formData: FormData) {
  const access = await requireCmsManager("/icerik/sss");
  const locale = localeFromForm(formData);
  const namespace = cmsLocaleNamespace("faq", locale);
  const requestedKey = field(formData, "contentKey", 140);
  const existing = requestedKey ? await getFaq(requestedKey, locale) : null;

  if (existing?.status === "published" && !access.canPublish) {
    redirect("/erisim-reddedildi?kaynak=icerik-yayin");
  }

  const question = field(formData, "question", 300);
  const answer = field(formData, "answer", 4000);
  const category = field(formData, "category", 80) || (locale === "en" ? "General" : "Genel");
  const audience = normalizeAudience(field(formData, "audience", 40));
  const position = normalizePosition(field(formData, "position", 5));
  if (!question || !answer) return;

  const existingPayload = existing ? parsePayload(existing.valueJson) : {};
  const id = existingPayload.id || randomUUID();
  const contentKey = existing?.contentKey || `item_${id}`;
  const status: FaqStatus = existing?.status ?? "draft";
  const valueJson = JSON.stringify({ id, question, answer, category, audience, position } satisfies FaqPayload);

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${namespace}, ${contentKey}, ${valueJson}, 'json', ${status},
      ${access.user!.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  refreshFaq(locale);
}

export async function publishFaqAction(formData: FormData) {
  const access = await requireCmsPublisher("/icerik/sss");
  const locale = localeFromForm(formData);
  const namespace = cmsLocaleNamespace("faq", locale);
  const contentKey = field(formData, "contentKey", 140);
  if (!contentKey.startsWith("item_")) return;

  await prisma.$executeRaw`
    UPDATE SiteContent
    SET status = 'published', publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = ${access.user!.id}, updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = ${namespace} AND contentKey = ${contentKey}
  `;
  refreshFaq(locale);
}

export async function unpublishFaqAction(formData: FormData) {
  const access = await requireCmsPublisher("/icerik/sss");
  const locale = localeFromForm(formData);
  const namespace = cmsLocaleNamespace("faq", locale);
  const contentKey = field(formData, "contentKey", 140);
  if (!contentKey.startsWith("item_")) return;

  await prisma.$executeRaw`
    UPDATE SiteContent
    SET status = 'draft', publishedAt = NULL,
      updatedById = ${access.user!.id}, updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = ${namespace} AND contentKey = ${contentKey} AND status = 'published'
  `;
  refreshFaq(locale);
}

export async function archiveFaqAction(formData: FormData) {
  const access = await getCmsAccess();
  if (!access.user || !access.canManage) redirect("/erisim-reddedildi?kaynak=icerik");
  const locale = localeFromForm(formData);
  const namespace = cmsLocaleNamespace("faq", locale);
  const contentKey = field(formData, "contentKey", 140);
  const existing = await getFaq(contentKey, locale);
  if (!existing) return;
  if (existing.status === "published" && !access.canPublish) redirect("/erisim-reddedildi?kaynak=icerik-yayin");

  await prisma.$executeRaw`
    UPDATE SiteContent
    SET status = 'archived', updatedById = ${access.user.id}, updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = ${namespace} AND contentKey = ${contentKey}
  `;
  refreshFaq(locale);
}

export async function restoreFaqDraftAction(formData: FormData) {
  const access = await requireCmsManager("/icerik/sss");
  const locale = localeFromForm(formData);
  const namespace = cmsLocaleNamespace("faq", locale);
  const contentKey = field(formData, "contentKey", 140);
  if (!contentKey.startsWith("item_")) return;

  await prisma.$executeRaw`
    UPDATE SiteContent
    SET status = 'draft', publishedAt = NULL,
      updatedById = ${access.user!.id}, updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = ${namespace} AND contentKey = ${contentKey} AND status = 'archived'
  `;
  refreshFaq(locale);
}
