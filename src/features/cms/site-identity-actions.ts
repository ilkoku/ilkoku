"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsAdmin } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import { cmsMediaLogoPattern, parseSiteIdentityStrict } from "@/lib/site-identity";

function text(formData: FormData, key: string, maxLength: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

async function logoIsPublishedCmsImage(logoUrl: string) {
  if (!logoUrl) return true;
  if (!cmsMediaLogoPattern.test(logoUrl)) return false;
  const id = logoUrl.split("/").pop();
  if (!id) return false;

  try {
    const rows = await prisma.$queryRaw<Array<{ valueJson: string }>>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'media'
        AND contentKey = ${`asset_${id}`}
        AND status = 'published'
      LIMIT 1
    `;
    if (!rows[0]) return false;
    const value = JSON.parse(rows[0].valueJson) as Record<string, unknown>;
    return value.kind === "image" && value.url === logoUrl;
  } catch {
    return false;
  }
}

export async function saveSiteIdentityAction(formData: FormData) {
  const access = await requireCmsAdmin("/icerik/site-kimligi");
  const user = access.user!;

  const candidate = {
    headerKicker: text(formData, "headerKicker", 100),
    defaultEyebrow: text(formData, "defaultEyebrow", 60),
    footerTaglineLead: text(formData, "footerTaglineLead", 120),
    footerTaglineEmphasis: text(formData, "footerTaglineEmphasis", 80),
    logoUrl: text(formData, "logoUrl", 500),
    logoAlt: text(formData, "logoAlt", 120),
  };

  const identity = parseSiteIdentityStrict(JSON.stringify(candidate));
  if (!identity) redirect("/icerik/site-kimligi?hata=alan");
  if (!(await logoIsPublishedCmsImage(identity.logoUrl))) redirect("/icerik/site-kimligi?hata=logo");

  const valueJson = JSON.stringify(identity);
  try {
    await prisma.$executeRaw`
      INSERT INTO SiteContent (
        id, namespace, contentKey, valueJson, valueType, status,
        publishedAt, updatedById, createdAt, updatedAt
      ) VALUES (
        ${randomUUID()}, 'site_identity', 'global', ${valueJson}, 'json', 'published',
        CURRENT_TIMESTAMP(3), ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
      ON DUPLICATE KEY UPDATE
        valueJson = VALUES(valueJson),
        valueType = 'json',
        status = 'published',
        publishedAt = CURRENT_TIMESTAMP(3),
        updatedById = VALUES(updatedById),
        updatedAt = CURRENT_TIMESTAMP(3)
    `;
  } catch {
    redirect("/icerik/site-kimligi?hata=kayit");
  }

  revalidatePath("/", "layout");
  revalidatePath("/icerik/site-kimligi");
  redirect("/icerik/site-kimligi?kaydedildi=1");
}
