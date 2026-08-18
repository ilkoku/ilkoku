"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import {
  deleteCmsDraft,
  getCmsDraftState,
  isCmsDraftCorruptionError,
  saveCmsDraft,
} from "@/lib/cms-drafts";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { normalizeCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";
import {
  cmsRoleKeys,
  roleCardsDraftKey,
  roleCardsNamespace,
  serializeRoleCards,
  type CmsRoleCard,
  type CmsRoleKey,
} from "@/lib/cms-role-cards";
import { prisma } from "@/lib/prisma";

function field(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function localeFromForm(formData: FormData) {
  return normalizeCmsLocale(field(formData, "locale", 8));
}

function redirectError(locale: CmsLocaleCode, code: string): never {
  redirect(`/icerik/rol-kartlari?dil=${locale}&hata=${code}`);
}

function cardFromForm(formData: FormData, role: CmsRoleKey): CmsRoleCard {
  return {
    key: role,
    title: field(formData, `${role}Title`, 80),
    description: field(formData, `${role}Description`, 700),
    ctaLabel: field(formData, `${role}CtaLabel`, 80),
    highlight1: field(formData, `${role}Highlight1`, 120),
    highlight2: field(formData, `${role}Highlight2`, 120),
    visible: formData.get(`${role}Visible`) === "on",
    position: Number(field(formData, `${role}Position`, 1)),
  };
}

function validateCards(cards: CmsRoleCard[]) {
  if (cards.length !== cmsRoleKeys.length) return false;
  const positions = new Set<number>();
  for (const card of cards) {
    if (!card.title || !card.description || !card.ctaLabel || !card.highlight1 || !card.highlight2) return false;
    if (!Number.isInteger(card.position) || card.position < 1 || card.position > 4) return false;
    if (positions.has(card.position)) return false;
    positions.add(card.position);
  }
  return positions.size === 4;
}

function revalidateRoleCardSurfaces(locale: CmsLocaleCode) {
  revalidatePath(locale === "en" ? "/en" : "/");
  revalidatePath("/icerik/rol-kartlari");
  revalidatePath("/icerik/onizleme/rol-kartlari");
  revalidatePath("/icerik/yayin-kuyrugu");
  revalidatePath("/icerik/saglik");
}

export async function saveRoleCardsAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/rol-kartlari");
  const locale = localeFromForm(formData);
  const cards = cmsRoleKeys.map((role) => cardFromForm(formData, role));

  if (!cards.every((card) => card.title && card.description && card.ctaLabel && card.highlight1 && card.highlight2)) {
    redirectError(locale, "alan");
  }
  if (!validateCards(cards)) redirectError(locale, "sira");

  try {
    await saveCmsDraft(user!.id, roleCardsDraftKey(locale), serializeRoleCards(cards));
  } catch (error) {
    if (isCmsDraftCorruptionError(error)) redirectError(locale, "taslak-bozuk");
    throw error;
  }

  revalidateRoleCardSurfaces(locale);
  redirect(`/icerik/rol-kartlari?dil=${locale}&kayit=1`);
}

export async function publishRoleCardsAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/rol-kartlari");
  const locale = localeFromForm(formData);
  if (!(await isCmsLocaleEnabled(locale))) redirectError(locale, "dil-pasif");

  const draftKey = roleCardsDraftKey(locale);
  const draftState = await getCmsDraftState(draftKey);
  if (draftState.state === "corrupt") redirectError(locale, "taslak-bozuk");
  if (draftState.state === "missing") redirectError(locale, "taslak-yok");

  const namespace = roleCardsNamespace(locale);
  const valueJson = JSON.stringify(draftState.record.payload);

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${namespace}, 'cards', ${valueJson}, 'json', 'published',
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
  revalidateRoleCardSurfaces(locale);
  redirect(`/icerik/rol-kartlari?dil=${locale}&yayin=1`);
}
