"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCmsManager } from "@/lib/cms-access";
import {
  EDITOR_EDUCATION_GUIDE_NAMESPACE,
  editorEducationGuideDefault,
  getEditorEducationGuideRecord,
  isEditorEducationVisualSlotKey,
} from "@/lib/cms-editor-education";
import { editorEducationPublicPath, getEditorEducationCategory } from "@/lib/editor-education";
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
      ${randomUUID()}, ${EDITOR_EDUCATION_GUIDE_NAMESPACE}, ${categorySlug}, ${valueJson}, 'json', 'published',
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

export async function removeEditorEducationGuideVisualAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/editor-egitim");
  const categorySlug = field(formData, "categorySlug", 100);
  const slot = field(formData, "slot", 40);
  const category = getEditorEducationCategory(categorySlug);
  if (!category || !isEditorEducationVisualSlotKey(slot)) redirect("/icerik/editor-egitim?hata=editor-gorsel");

  const current = await getEditorEducationGuideRecord(category.slug) ?? editorEducationGuideDefault(category);
  const visuals = { ...current.visuals };
  delete visuals[slot];
  await upsertGuide(user!.id, category.slug, { ...current, visuals });

  revalidatePath("/icerik/editor-egitim");
  revalidatePath(`/icerik/editor-egitim/${category.slug}`);
  revalidatePath(editorEducationPublicPath(category));
  redirect(`/icerik/editor-egitim/${category.slug}?kaldirildi=${slot}`);
}
