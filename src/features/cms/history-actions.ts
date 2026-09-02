"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import { deleteCmsDraft, getCmsDraftState, saveCmsDraft } from "@/lib/cms-drafts";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace, normalizeCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
import { historyDefaults } from "@/lib/history-content";
import { prisma } from "@/lib/prisma";

function field(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function localeFromForm(formData: FormData) {
  return normalizeCmsLocale(field(formData, "locale", 8));
}

function imageField(formData: FormData, name: string, fallback: string) {
  const value = field(formData, name, 600);
  return value.startsWith("/") || value.startsWith("https://") ? value : fallback;
}

function historyDraftKey(locale: CmsLocaleCode) {
  return `history:${locale}`;
}

function buildPayload(formData: FormData) {
  const payload: Record<string, string> = {
    backgroundColor: field(formData, "backgroundColor", 32) || historyDefaults.backgroundColor,
    introEyebrow: field(formData, "introEyebrow", 120),
    introTitle: field(formData, "introTitle", 220),
    introDescription1: field(formData, "introDescription1", 500),
    introDescription2: field(formData, "introDescription2", 500),
    leftDecorImage: imageField(formData, "leftDecorImage", historyDefaults.leftDecorImage),
    leftDecorAlt: field(formData, "leftDecorAlt", 220),
    cardVisible: field(formData, "cardVisible", 1) === "0" ? "0" : "1",
    cardBackgroundImage: imageField(formData, "cardBackgroundImage", ""),
    cardEyebrow: field(formData, "cardEyebrow", 120),
    cardTitleLine1: field(formData, "cardTitleLine1", 180),
    cardTitleLine2: field(formData, "cardTitleLine2", 180),
    closingQuestion: field(formData, "closingQuestion", 220),
    bottomSlogan: field(formData, "bottomSlogan", 180),
    brandText: field(formData, "brandText", 100),
    sealImage: imageField(formData, "sealImage", historyDefaults.sealImage),
    sealAlt: field(formData, "sealAlt", 220),
    sealVisible: field(formData, "sealVisible", 1) === "0" ? "0" : "1",
  };

  for (let index = 1; index <= 4; index += 1) {
    payload[`card${index}Period`] = field(formData, `card${index}Period`, 120);
    payload[`card${index}Title`] = field(formData, `card${index}Title`, 180);
    payload[`card${index}Lead`] = field(formData, `card${index}Lead`, 420);
    payload[`card${index}Body`] = field(formData, `card${index}Body`, 420);
    payload[`card${index}Image`] = imageField(formData, `card${index}Image`, historyDefaults[`card${index}Image`]);
    payload[`card${index}Alt`] = field(formData, `card${index}Alt`, 220);
    payload[`step${index}Image`] = imageField(formData, `step${index}Image`, historyDefaults[`step${index}Image`]);
    payload[`step${index}Alt`] = field(formData, `step${index}Alt`, 220);
    payload[`step${index}Text`] = field(formData, `step${index}Text`, 420);
  }

  return payload;
}

export async function saveHomepageHistoryAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/ana-sayfa/history");
  const locale = localeFromForm(formData);
  const payload = buildPayload(formData);
  if (!payload.introEyebrow || !payload.introTitle || !payload.cardTitleLine1 || !payload.cardTitleLine2 || !payload.closingQuestion) return;
  await saveCmsDraft(user!.id, historyDraftKey(locale), payload);
  revalidatePath("/icerik/ana-sayfa/history");
}

export async function publishHomepageHistoryAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/ana-sayfa/history");
  const locale = localeFromForm(formData);
  if (!(await isCmsLocaleEnabled(locale))) redirect(`/icerik/ana-sayfa/history?dil=${locale}&hata=dil-pasif`);

  const draftKey = historyDraftKey(locale);
  const state = await getCmsDraftState<Record<string, string>>(draftKey);
  if (state.state !== "valid") return;
  const valueJson = JSON.stringify(state.record.payload);
  const namespace = cmsLocaleNamespace("homepage", locale);

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${namespace}, 'history', ${valueJson}, 'json', 'published',
      CURRENT_TIMESTAMP(3), ${user!.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = 'published',
      publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  await deleteCmsDraft(draftKey);
  revalidatePath("/icerik/ana-sayfa/history");
  revalidatePath("/onizleme/history-15");
}
