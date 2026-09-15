"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import {
  EDITOR_EDUCATION_GUIDE_NAMESPACE,
  EDITOR_EDUCATION_TEXT_DRAFT_NAMESPACE,
  EDITOR_EDUCATION_TEXT_NAMESPACE,
  EDITOR_EDUCATION_TEXT_REVISION_NAMESPACE,
  editorEducationGuideDefault,
  getEditorEducationGuideRecord,
  getEditorEducationPublishedTextRecord,
  isEditorEducationVisualSlotKey,
  parseEditorEducationText,
} from "@/lib/cms-editor-education";
import { editorEducationPublicPath, getEditorEducationCategory } from "@/lib/editor-education";
import { getEditorEducationSourceTree } from "@/lib/editor-education-source";
import { collectEditorEducationTextFields, type EditorEducationTextOverrides } from "@/lib/editor-education-text";
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

async function upsertTextRecord(
  namespace: string,
  userId: string,
  categorySlug: string,
  payload: unknown,
  status: "draft" | "published",
) {
  const valueJson = JSON.stringify(payload);
  const publishedAt = status === "published" ? new Date() : null;
  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${namespace}, ${categorySlug}, ${valueJson}, 'json', ${status},
      ${publishedAt}, ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = VALUES(status),
      publishedAt = VALUES(publishedAt),
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;
}

async function appendTextRevision(userId: string, categorySlug: string, version: number, payload: unknown) {
  const versionPart = String(version).padStart(6, "0");
  const revisionKey = `${categorySlug}:${versionPart}:${randomUUID()}`;
  const valueJson = JSON.stringify(payload);
  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${EDITOR_EDUCATION_TEXT_REVISION_NAMESPACE}, ${revisionKey}, ${valueJson}, 'json', 'published',
      CURRENT_TIMESTAMP(3), ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
  `;
}

async function submittedTextOverrides(formData: FormData, categorySlug: string) {
  const tree = await getEditorEducationSourceTree(categorySlug);
  if (!tree) throw new Error("editor-education-source");
  const fields = collectEditorEducationTextFields(tree);
  const overrides: EditorEducationTextOverrides = {};
  for (const item of fields) {
    const submitted = String(formData.get(`text_${item.key}`) ?? item.value).trim().slice(0, 12000);
    if (submitted && submitted !== item.value) overrides[item.key] = submitted;
  }
  return { overrides, fieldCount: fields.length };
}

function refreshEditorEducation(categorySlug: string) {
  const category = getEditorEducationCategory(categorySlug);
  revalidatePath("/icerik/editor-egitim");
  revalidatePath(`/icerik/editor-egitim/${categorySlug}`);
  revalidatePath(`/icerik/onizleme/editor-egitim/${categorySlug}`);
  if (category) revalidatePath(editorEducationPublicPath(category));
}

export async function saveEditorEducationTextAction(formData: FormData) {
  const categorySlug = field(formData, "categorySlug", 100);
  const category = getEditorEducationCategory(categorySlug);
  if (!category) redirect("/icerik/editor-egitim?hata=editor-egitim");

  const mode = field(formData, "mode", 20) === "publish" ? "publish" : "draft";
  const access = mode === "publish"
    ? await requireCmsPublisher(`/icerik/editor-egitim/${category.slug}`)
    : await requireCmsManager(`/icerik/editor-egitim/${category.slug}`);
  const user = access.user!;

  let submitted: Awaited<ReturnType<typeof submittedTextOverrides>>;
  try {
    submitted = await submittedTextOverrides(formData, category.slug);
  } catch {
    redirect(`/icerik/editor-egitim/${category.slug}?hata=metin-kaynagi`);
  }

  const published = await getEditorEducationPublishedTextRecord(category.slug);
  const currentVersion = published?.version ?? 0;
  const savedAt = new Date().toISOString();

  if (mode === "draft") {
    await upsertTextRecord(
      EDITOR_EDUCATION_TEXT_DRAFT_NAMESPACE,
      user.id,
      category.slug,
      {
        categorySlug: category.slug,
        version: currentVersion,
        overrides: submitted.overrides,
        savedAt,
        fieldCount: submitted.fieldCount,
      },
      "draft",
    );
    refreshEditorEducation(category.slug);
    redirect(`/icerik/editor-egitim/${category.slug}?taslak=1`);
  }

  const nextVersion = currentVersion + 1;
  const payload = {
    categorySlug: category.slug,
    version: nextVersion,
    overrides: submitted.overrides,
    savedAt,
    fieldCount: submitted.fieldCount,
  };
  await upsertTextRecord(EDITOR_EDUCATION_TEXT_NAMESPACE, user.id, category.slug, payload, "published");
  await appendTextRevision(user.id, category.slug, nextVersion, payload);
  await prisma.$executeRaw`
    DELETE FROM SiteContent
    WHERE namespace = ${EDITOR_EDUCATION_TEXT_DRAFT_NAMESPACE}
      AND contentKey = ${category.slug}
  `;
  refreshEditorEducation(category.slug);
  redirect(`/icerik/editor-egitim/${category.slug}?yayin=1`);
}

export async function discardEditorEducationTextDraftAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/editor-egitim");
  if (!user) redirect("/icerik/editor-egitim");
  const categorySlug = field(formData, "categorySlug", 100);
  const category = getEditorEducationCategory(categorySlug);
  if (!category) redirect("/icerik/editor-egitim?hata=editor-egitim");
  await prisma.$executeRaw`
    DELETE FROM SiteContent
    WHERE namespace = ${EDITOR_EDUCATION_TEXT_DRAFT_NAMESPACE}
      AND contentKey = ${category.slug}
  `;
  refreshEditorEducation(category.slug);
  redirect(`/icerik/editor-egitim/${category.slug}?taslak-silindi=1`);
}

export async function restoreEditorEducationTextRevisionAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/editor-egitim");
  const categorySlug = field(formData, "categorySlug", 100);
  const revisionKey = field(formData, "revisionKey", 220);
  const category = getEditorEducationCategory(categorySlug);
  if (!category || !revisionKey.startsWith(`${category.slug}:`)) {
    redirect("/icerik/editor-egitim?hata=surum");
  }

  const rows = await prisma.$queryRaw<Array<{ valueJson: string }>>`
    SELECT valueJson
    FROM SiteContent
    WHERE namespace = ${EDITOR_EDUCATION_TEXT_REVISION_NAMESPACE}
      AND contentKey = ${revisionKey}
      AND status = 'published'
    LIMIT 1
  `;
  if (!rows[0]) redirect(`/icerik/editor-egitim/${category.slug}?hata=surum`);
  const revision = parseEditorEducationText(rows[0].valueJson, category);
  await upsertTextRecord(
    EDITOR_EDUCATION_TEXT_DRAFT_NAMESPACE,
    user!.id,
    category.slug,
    {
      ...revision,
      savedAt: new Date().toISOString(),
    },
    "draft",
  );
  refreshEditorEducation(category.slug);
  redirect(`/icerik/editor-egitim/${category.slug}?surum=${revision.version}`);
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
