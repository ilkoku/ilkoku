"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { normalizeCmsLocale } from "@/lib/cms-locales";
import {
  cmsLegalContentKey,
  cmsLegalPublicPath,
  getCmsLegalDocument,
} from "@/lib/cms-legal";
import { prisma } from "@/lib/prisma";

export async function saveCmsDocumentAction(formData: FormData) {
  const mode = String(formData.get("mode") ?? "draft");
  const locale = normalizeCmsLocale(String(formData.get("locale") ?? "tr"));

  if (mode === "publish" && !(await isCmsLocaleEnabled(locale))) {
    redirect(`/icerik/yasal?hata=dil-pasif&dil=${locale}`);
  }

  const access = mode === "publish"
    ? await requireCmsPublisher("/icerik/yasal")
    : await requireCmsManager("/icerik/yasal");
  const currentUser = access.user!;

  const slug = String(formData.get("slug") ?? "").trim();
  const document = getCmsLegalDocument(slug);
  if (!document) return;

  const status = mode === "publish" ? "published" : "draft";
  const title = String(formData.get("title") ?? "").trim().slice(0, 220);
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);
  const updatedLabel = String(formData.get("updatedLabel") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return;

  const bodyJson = JSON.stringify({ description, updatedLabel, body });
  const contentKey = cmsLegalContentKey(document.slug, locale);
  const path = cmsLegalPublicPath(document.slug, locale);

  await prisma.$executeRaw`
    INSERT INTO ContentPage (
      id, contentKey, slug, title, status, bodyJson,
      seoDescription, canonicalUrl, noIndex, publishedAt,
      createdById, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${contentKey}, ${path}, ${title}, ${status}, ${bodyJson},
      ${description || null}, ${path}, false,
      ${status === "published" ? new Date() : null},
      ${currentUser.id}, ${currentUser.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      title = VALUES(title), status = VALUES(status), bodyJson = VALUES(bodyJson),
      seoDescription = VALUES(seoDescription), canonicalUrl = VALUES(canonicalUrl),
      publishedAt = VALUES(publishedAt), updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  const pages = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM ContentPage WHERE contentKey = ${contentKey} LIMIT 1
  `;
  const pageId = pages[0]?.id;
  if (!pageId) return;

  const versions = await prisma.$queryRaw<Array<{ version: number }>>`
    SELECT COALESCE(MAX(version), 0) + 1 AS version FROM ContentRevision WHERE pageId = ${pageId}
  `;
  const version = Number(versions[0]?.version ?? 1);
  const snapshotJson = JSON.stringify({ locale, title, description, updatedLabel, body, status });

  await prisma.$executeRaw`
    INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
    VALUES (${randomUUID()}, ${pageId}, ${version}, ${snapshotJson}, ${currentUser.id}, CURRENT_TIMESTAMP(3))
  `;

  revalidatePath("/icerik/yasal");
  revalidatePath(`/icerik/yasal/${slug}`);
  if (status === "published") revalidatePath(path);
}
