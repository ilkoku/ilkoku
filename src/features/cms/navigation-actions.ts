"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/icerik/menuler");
  if (user.role !== "admin") redirect("/erisim-reddedildi?kaynak=icerik");
  return user;
}

function value(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function saveFooterNavigationAction(formData: FormData) {
  const user = await requireAdmin();
  const payload = {
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
  const valueJson = JSON.stringify(payload);

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, 'site', 'footer_navigation', ${valueJson}, 'json', 'draft',
      ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = 'draft',
      publishedAt = NULL,
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  revalidatePath("/icerik/menuler");
}

export async function publishFooterNavigationAction() {
  const user = await requireAdmin();
  await prisma.$executeRaw`
    UPDATE SiteContent
    SET status = 'published',
      publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = ${user.id},
      updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = 'site'
      AND contentKey = 'footer_navigation'
  `;
  revalidatePath("/");
  revalidatePath("/icerik/menuler");
}
