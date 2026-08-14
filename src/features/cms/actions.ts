"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
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
  const namespace = cmsLocaleNamespace("homepage", locale);
  const valueJson = JSON.stringify(value);

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${namespace}, ${contentKey}, ${valueJson}, 'json', 'draft',
      ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = 'draft',
      publishedAt = NULL,
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  revalidatePath("/icerik/ana-sayfa");
}

async function publishHomepageSection(
  userId: string,
  locale: CmsLocaleCode,
  contentKey: string,
) {
  const namespace = cmsLocaleNamespace("homepage", locale);

  await prisma.$executeRaw`
    UPDATE SiteContent
    SET status = 'published',
      publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = ${userId},
      updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = ${namespace}
      AND contentKey = ${contentKey}
  `;

  revalidatePath(cmsLocalePublicPath("/", locale));
  revalidatePath("/icerik/ana-sayfa");
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
