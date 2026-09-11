"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager } from "@/lib/cms-access";
import {
  EDUCATION_GUIDE_NAMESPACE,
  educationGuideDefault,
  educationPublicPath,
  getEducationGuideRecord,
  isEducationVisualSlotKey,
} from "@/lib/cms-education";
import { getGenreBySlug } from "@/lib/genres";
import { prisma } from "@/lib/prisma";

function field(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

async function upsertGuide(userId: string, genreSlug: string, payload: unknown) {
  const valueJson = JSON.stringify(payload);
  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${EDUCATION_GUIDE_NAMESPACE}, ${genreSlug}, ${valueJson}, 'json', 'published',
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

export async function saveEducationGuideMetaAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/egitim");
  const genreSlug = field(formData, "genreSlug", 100);
  const genre = getGenreBySlug(genreSlug);
  if (!genre) redirect("/icerik/egitim?hata=tur");

  const current = await getEducationGuideRecord(genre.slug) ?? educationGuideDefault(genre);
  const title = field(formData, "title", 220) || current.title;
  const summary = field(formData, "summary", 1200) || current.summary;

  await upsertGuide(user!.id, genre.slug, { ...current, title, summary });
  revalidatePath("/icerik/egitim");
  revalidatePath(`/icerik/egitim/${genre.slug}`);
  revalidatePath(educationPublicPath(genre));
  redirect(`/icerik/egitim/${genre.slug}?kaydedildi=1`);
}

export async function removeEducationGuideVisualAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/egitim");
  const genreSlug = field(formData, "genreSlug", 100);
  const slot = field(formData, "slot", 40);
  const genre = getGenreBySlug(genreSlug);
  if (!genre || !isEducationVisualSlotKey(slot)) redirect("/icerik/egitim?hata=gorsel");

  const current = await getEducationGuideRecord(genre.slug) ?? educationGuideDefault(genre);
  const visuals = { ...current.visuals };
  delete visuals[slot];
  await upsertGuide(user!.id, genre.slug, { ...current, visuals });

  revalidatePath("/icerik/egitim");
  revalidatePath(`/icerik/egitim/${genre.slug}`);
  revalidatePath(educationPublicPath(genre));
  redirect(`/icerik/egitim/${genre.slug}?kaldirildi=${slot}`);
}
