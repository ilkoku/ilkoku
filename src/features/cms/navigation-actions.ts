"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  FOOTER_DRAFT_KEY,
  FOOTER_LIVE_KEY,
  parseFooterNavigation,
  type FooterNavigationPayload,
} from "@/lib/cms-footer-navigation";
import { prisma } from "@/lib/prisma";

type FooterRow = { valueJson: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/icerik/menuler");
  if (user.role !== "admin") redirect("/erisim-reddedildi?kaynak=icerik");
  return user;
}

function value(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function footerPayload(formData: FormData): FooterNavigationPayload {
  return {
    platformTitle: value(formData, "platformTitle", 80),
    platform1Label: value(formData, "platform1Label", 100),
    platform1Href: value(formData, "platform1Href"),
    platform2Label: value(formData, "platform2Label", 100),
    platform2Href: value(formData, "platform2Href"),
    platform3Label: value(formData, "platform3Label", 100),
    platform3Href: value(formData, "platform3Href"),
    supportTitle: value(formData, "supportTitle", 80),
    supportLabel: value(formData, "supportLabel", 100),
    supportHref: value(formData, "supportHref"),
    legalTitle: value(formData, "legalTitle", 80),
    termsLabel: value(formData, "termsLabel", 100),
    termsHref: value(formData, "termsHref"),
    privacyLabel: value(formData, "privacyLabel", 100),
    privacyHref: value(formData, "privacyHref"),
    kvkkLabel: value(formData, "kvkkLabel", 100),
    kvkkHref: value(formData, "kvkkHref"),
    cookieLabel: value(formData, "cookieLabel", 100),
    cookieHref: value(formData, "cookieHref"),
    copyrightLabel: value(formData, "copyrightLabel", 100),
    copyrightHref: value(formData, "copyrightHref"),
  };
}

export async function saveFooterNavigationAction(formData: FormData) {
  const user = await requireAdmin();
  const valueJson = JSON.stringify(footerPayload(formData));

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, 'site', ${FOOTER_DRAFT_KEY}, ${valueJson}, 'json', 'draft',
      ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      valueType = 'json',
      status = 'draft',
      publishedAt = NULL,
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  revalidatePath("/icerik/menuler");
  redirect("/icerik/menuler?taslak=1");
}

export async function publishFooterNavigationAction() {
  const user = await requireAdmin();
  const rows = await prisma.$queryRaw<FooterRow[]>`
    SELECT valueJson
    FROM SiteContent
    WHERE namespace = 'site'
      AND contentKey = ${FOOTER_DRAFT_KEY}
      AND status = 'draft'
    LIMIT 1
  `;
  const draft = rows[0];
  if (!draft || !parseFooterNavigation(draft.valueJson)) {
    redirect("/icerik/menuler?hata=taslak");
  }

  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO SiteContent (
        id, namespace, contentKey, valueJson, valueType, status,
        publishedAt, updatedById, createdAt, updatedAt
      ) VALUES (
        ${randomUUID()}, 'site', ${FOOTER_LIVE_KEY}, ${draft.valueJson}, 'json', 'published',
        CURRENT_TIMESTAMP(3), ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
      ON DUPLICATE KEY UPDATE
        valueJson = VALUES(valueJson),
        valueType = 'json',
        status = 'published',
        publishedAt = CURRENT_TIMESTAMP(3),
        updatedById = VALUES(updatedById),
        updatedAt = CURRENT_TIMESTAMP(3)
    `,
    prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'archived', publishedAt = NULL,
          updatedById = ${user.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'site'
        AND contentKey = ${FOOTER_DRAFT_KEY}
        AND status = 'draft'
    `,
  ]);

  revalidatePath("/");
  revalidatePath("/icerik/menuler");
  redirect("/icerik/menuler?yayin=1");
}
