"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import { deleteCmsDraft, getCmsDraft, homepageDraftKey, saveCmsDraft } from "@/lib/cms-drafts";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import {
  cmsLocaleNamespace,
  cmsLocalePublicPath,
  normalizeCmsLocale,
  type CmsLocaleCode,
} from "@/lib/cms-locales";
import { safeCmsInternalHref } from "@/lib/cms-links";
import { prisma } from "@/lib/prisma";

function field(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function localeFromForm(formData: FormData) {
  return normalizeCmsLocale(field(formData, "locale", 8));
}

async function saveHomepageSection(
  userId: string,
  locale: CmsLocaleCode,
  contentKey: string,
  value: Record<string, string>,
) {
  await saveCmsDraft(userId, homepageDraftKey(locale, contentKey), value);
  revalidatePath("/icerik/ana-sayfa");
  revalidatePath("/icerik/onizleme/ana-sayfa");
}

async function publishHomepageSection(
  userId: string,
  locale: CmsLocaleCode,
  contentKey: string,
) {
  if (!(await isCmsLocaleEnabled(locale))) {
    redirect(`/icerik/ana-sayfa?dil=${locale}&hata=dil-pasif`);
  }

  const namespace = cmsLocaleNamespace("homepage", locale);
  const draftKey = homepageDraftKey(locale, contentKey);
  const draft = await getCmsDraft<Record<string, string>>(draftKey);
  if (!draft) return;
  const valueJson = JSON.stringify(draft.payload);

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${namespace}, ${contentKey}, ${valueJson}, 'json', 'published',
      CURRENT_TIMESTAMP(3), ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = 'published',
      publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  await deleteCmsDraft(draftKey);
  revalidatePath(cmsLocalePublicPath("/", locale));
  revalidatePath("/icerik/ana-sayfa");
  revalidatePath("/icerik/onizleme/ana-sayfa");
}

export async function saveHomepageHeroAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/ana-sayfa");
  const locale = localeFromForm(formData);
  const title = field(formData, "title", 220);
  const description = field(formData, "description", 1000);
  const primaryCtaLabel = field(formData, "primaryCtaLabel", 80);
  const primaryCtaHref = safeCmsInternalHref(field(formData, "primaryCtaHref", 300));
  const secondaryCtaLabel = field(formData, "secondaryCtaLabel", 80);
  const secondaryCtaHref = safeCmsInternalHref(field(formData, "secondaryCtaHref", 300));
  if (!title || !description) return;

  await saveHomepageSection(user!.id, locale, "hero", {
    title,
    description,
    primaryCtaLabel,
    primaryCtaHref,
    secondaryCtaLabel,
    secondaryCtaHref,
  });
}

export async function publishHomepageHeroAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/ana-sayfa");
  await publishHomepageSection(user!.id, localeFromForm(formData), "hero");
}

export async function saveHomepageRolesAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/ana-sayfa");
  const locale = localeFromForm(formData);
  const eyebrow = field(formData, "eyebrow", 120);
  const title = field(formData, "title", 220);
  const description = field(formData, "description", 700);
  if (!title) return;
  await saveHomepageSection(user!.id, locale, "roles", { eyebrow, title, description });
}

export async function publishHomepageRolesAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/ana-sayfa");
  await publishHomepageSection(user!.id, localeFromForm(formData), "roles");
}

export async function saveHomepagePassportAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/ana-sayfa");
  const locale = localeFromForm(formData);
  const eyebrow = field(formData, "eyebrow", 120);
  const title = field(formData, "title", 260);
  const description = field(formData, "description", 1200);
  const ctaLabel = field(formData, "ctaLabel", 80);
  const ctaHref = safeCmsInternalHref(field(formData, "ctaHref", 300));
  if (!title || !description) return;
  await saveHomepageSection(user!.id, locale, "passport", {
    eyebrow,
    title,
    description,
    ctaLabel,
    ctaHref,
  });
}

export async function publishHomepagePassportAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/ana-sayfa");
  await publishHomepageSection(user!.id, localeFromForm(formData), "passport");
}

export async function saveHomepageWhyAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/ana-sayfa");
  const locale = localeFromForm(formData);
  const eyebrow = field(formData, "eyebrow", 120);
  const title = field(formData, "title", 220);
  const description = field(formData, "description", 700);
  if (!title) return;
  await saveHomepageSection(user!.id, locale, "why", { eyebrow, title, description });
}

export async function publishHomepageWhyAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/ana-sayfa");
  await publishHomepageSection(user!.id, localeFromForm(formData), "why");
}

export async function saveHomepageFooterAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/ana-sayfa");
  const locale = localeFromForm(formData);
  const slogan = field(formData, "slogan", 220);
  const supportEmail = field(formData, "supportEmail", 220);
  const copyright = field(formData, "copyright", 300);
  if (!slogan) return;
  await saveHomepageSection(user!.id, locale, "footer", { slogan, supportEmail, copyright });
}

export async function publishHomepageFooterAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/ana-sayfa");
  await publishHomepageSection(user!.id, localeFromForm(formData), "footer");
}
