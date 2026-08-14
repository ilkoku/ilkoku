"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireCmsAdmin } from "@/lib/cms-access";
import { normalizeCmsLocale } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

export async function updateCmsLocaleAction(formData: FormData) {
  const access = await requireCmsAdmin("/icerik/diller");
  const locale = normalizeCmsLocale(String(formData.get("locale") ?? "tr"));

  if (locale === "tr") return;

  const enabled = String(formData.get("enabled") ?? "") === "true";
  const valueJson = JSON.stringify({ enabled });

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, 'cms_locale', ${locale}, ${valueJson}, 'json', 'published',
      CURRENT_TIMESTAMP(3), ${access.user!.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = 'published',
      publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  revalidatePath("/icerik/diller");
  revalidatePath("/en");
  revalidatePath("/en/yardim");
  revalidatePath("/sitemap.xml");
}
