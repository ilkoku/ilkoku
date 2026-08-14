"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import {
  cmsGuideContentKey,
  cmsGuideLocaleFromContentKey,
  cmsGuidePublicPath,
  normalizeGuideSlug,
} from "@/lib/cms-guides";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { normalizeCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type ExistingGuide = {
  id: string;
  contentKey: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

function localeFromForm(formData: FormData) {
  return normalizeCmsLocale(String(formData.get("locale") ?? "tr"));
}

function cmsListPath(locale: CmsLocaleCode, suffix = "") {
  const join = suffix ? `&${suffix}` : "";
  return `/icerik/rehber?dil=${locale}${join}`;
}

async function addRevision(pageId: string, userId: string, snapshot: Record<string, unknown>) {
  const rows = await prisma.$queryRaw<Array<{ version: number | bigint }>>`
    SELECT COALESCE(MAX(version), 0) + 1 AS version
    FROM ContentRevision
    WHERE pageId = ${pageId}
  `;
  const version = Number(rows[0]?.version ?? 1);

  await prisma.$executeRaw`
    INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
    VALUES (${randomUUID()}, ${pageId}, ${version}, ${JSON.stringify(snapshot)}, ${userId}, CURRENT_TIMESTAMP(3))
  `;
}

export async function saveCmsGuideAction(formData: FormData) {
  const mode = String(formData.get("mode") ?? "draft");
  let access = await requireCmsManager("/icerik/rehber");

  const requestedId = String(formData.get("id") ?? "").trim();
  let existing: ExistingGuide | null = null;

  if (requestedId) {
    const rows = await prisma.$queryRaw<ExistingGuide[]>`
      SELECT id, contentKey, slug, status
      FROM ContentPage
      WHERE id = ${requestedId}
        AND contentKey LIKE 'guide:%'
      LIMIT 1
    `;
    existing = rows[0] ?? null;
    if (!existing) redirect("/icerik/rehber?hata=kayit");
  }

  const locale = existing ? cmsGuideLocaleFromContentKey(existing.contentKey) : localeFromForm(formData);

  if (mode === "publish" && !(await isCmsLocaleEnabled(locale))) {
    redirect(cmsListPath(locale, "hata=dil-pasif"));
  }

  if (mode === "publish" || existing?.status === "published") {
    access = await requireCmsPublisher("/icerik/rehber");
  }
  const user = access.user!;

  const prefix = locale === "en" ? /^\/en\/rehber\// : /^\/rehber\//;
  const rawSlug = existing?.slug.replace(prefix, "") ?? String(formData.get("slug") ?? "");
  const slugPart = normalizeGuideSlug(rawSlug);
  const title = String(formData.get("title") ?? "").trim().slice(0, 220);
  const summary = String(formData.get("summary") ?? "").trim().slice(0, 500);
  const body = String(formData.get("body") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim().slice(0, 220);
  const seoDescription = String(formData.get("seoDescription") ?? "").trim().slice(0, 500);
  const noIndex = formData.get("noIndex") === "on";

  if (!slugPart || !title || !body) redirect(cmsListPath(locale, "hata=zorunlu"));

  const fullSlug = cmsGuidePublicPath(slugPart, locale);
  const contentKey = existing?.contentKey ?? cmsGuideContentKey(slugPart, locale);
  const status = mode === "publish" ? "published" : "draft";
  const bodyJson = JSON.stringify({ summary, body });

  if (!existing) {
    const duplicate = await prisma.$queryRaw<Array<{ total: number | bigint }>>`
      SELECT COUNT(*) AS total
      FROM ContentPage
      WHERE slug = ${fullSlug} OR contentKey = ${contentKey}
    `;
    if (Number(duplicate[0]?.total ?? 0) > 0) redirect(cmsListPath(locale, "hata=slug"));

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO ContentPage (
        id, contentKey, slug, title, status, bodyJson,
        seoTitle, seoDescription, canonicalUrl, noIndex, publishedAt,
        createdById, updatedById, createdAt, updatedAt
      ) VALUES (
        ${id}, ${contentKey}, ${fullSlug}, ${title}, ${status}, ${bodyJson},
        ${seoTitle || null}, ${seoDescription || summary || null}, ${fullSlug}, ${noIndex},
        ${status === "published" ? new Date() : null},
        ${user.id}, ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
    `;
    await addRevision(id, user.id, { locale, title, summary, body, seoTitle, seoDescription, noIndex, status });

    revalidatePath("/icerik");
    revalidatePath("/icerik/rehber");
    if (locale === "tr") {
      revalidatePath("/rehber");
      revalidatePath(fullSlug);
    }
    redirect(`/icerik/rehber/${id}?dil=${locale}&kayit=1`);
  }

  await prisma.$executeRaw`
    UPDATE ContentPage
    SET title = ${title},
        status = ${status},
        bodyJson = ${bodyJson},
        seoTitle = ${seoTitle || null},
        seoDescription = ${seoDescription || summary || null},
        canonicalUrl = ${existing.slug},
        noIndex = ${noIndex},
        publishedAt = ${status === "published" ? new Date() : null},
        updatedById = ${user.id},
        updatedAt = CURRENT_TIMESTAMP(3)
    WHERE id = ${existing.id}
  `;

  await addRevision(existing.id, user.id, { locale, title, summary, body, seoTitle, seoDescription, noIndex, status });

  revalidatePath("/icerik");
  revalidatePath("/icerik/rehber");
  revalidatePath(`/icerik/rehber/${existing.id}`);
  if (locale === "tr") {
    revalidatePath("/rehber");
    revalidatePath(existing.slug);
  }
  redirect(`/icerik/rehber/${existing.id}?dil=${locale}&kayit=1`);
}

export async function archiveCmsGuideAction(formData: FormData) {
  let access = await requireCmsManager("/icerik/rehber");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const rows = await prisma.$queryRaw<ExistingGuide[]>`
    SELECT id, contentKey, slug, status
    FROM ContentPage
    WHERE id = ${id}
      AND contentKey LIKE 'guide:%'
    LIMIT 1
  `;
  const guide = rows[0];
  if (!guide) return;

  const locale = cmsGuideLocaleFromContentKey(guide.contentKey);
  if (guide.status === "published") {
    access = await requireCmsPublisher("/icerik/rehber");
  }
  const user = access.user!;

  await prisma.$executeRaw`
    UPDATE ContentPage
    SET status = 'archived', publishedAt = NULL, updatedById = ${user.id}, updatedAt = CURRENT_TIMESTAMP(3)
    WHERE id = ${guide.id}
  `;
  await addRevision(guide.id, user.id, { locale, status: "archived" });

  revalidatePath("/icerik");
  revalidatePath("/icerik/rehber");
  if (locale === "tr") {
    revalidatePath("/rehber");
    revalidatePath(guide.slug);
  }
  redirect(cmsListPath(locale, "arsiv=1"));
}
