"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCmsManager } from "@/lib/cms-access";
import {
  READER_EDUCATION_GUIDE_NAMESPACE,
  getReaderEducationGuideRecord,
  isReaderEducationVisualSlotKey,
  readerEducationGuideDefault,
} from "@/lib/cms-reader-education";
import { getReaderEducationCategory, readerEducationPublicPath } from "@/lib/reader-education";
import { prisma } from "@/lib/prisma";

function field(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

async function upsertGuide(userId: string, categorySlug: string, payload: unknown) {
  const valueJson = JSON.stringify(payload);
  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${READER_EDUCATION_GUIDE_NAMESPACE}, ${categorySlug}, ${valueJson}, 'json', 'published',
      CURRENT_TIMESTAMP(3), ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = 'published',
      publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;
}

export async function saveReaderEducationGuideMetaAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/okur-egitim");
  const categorySlug = field(formData, "categorySlug", 100);
  const category = getReaderEducationCategory(categorySlug);
  if (!category) redirect("/icerik/okur-egitim?hata=okur-egitimi");

  const current = await getReaderEducationGuideRecord(category.slug) ?? readerEducationGuideDefault(category);
  const title = field(formData, "title", 220) || current.title;
  const summary = field(formData, "summary", 1200) || current.summary;

  await upsertGuide(user!.id, category.slug, { ...current, title, summary });
  revalidatePath("/icerik/okur-egitim");
  revalidatePath(`/icerik/okur-egitim/${category.slug}`);
  revalidatePath(readerEducationPublicPath(category));
  redirect(`/icerik/okur-egitim/${category.slug}?kaydedildi=1`);
}

export async function removeReaderEducationGuideVisualAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/okur-egitim");
  const categorySlug = field(formData, "categorySlug", 100);
  const slot = field(formData, "slot", 40);
  const category = getReaderEducationCategory(categorySlug);
  if (!category || !isReaderEducationVisualSlotKey(slot)) redirect("/icerik/okur-egitim?hata=okur-gorsel");

  const current = await getReaderEducationGuideRecord(category.slug) ?? readerEducationGuideDefault(category);
  const visuals = { ...current.visuals };
  delete visuals[slot];
  await upsertGuide(user!.id, category.slug, { ...current, visuals });

  revalidatePath("/icerik/okur-egitim");
  revalidatePath(`/icerik/okur-egitim/${category.slug}`);
  revalidatePath(readerEducationPublicPath(category));
  redirect(`/icerik/okur-egitim/${category.slug}?kaldirildi=${slot}`);
}
