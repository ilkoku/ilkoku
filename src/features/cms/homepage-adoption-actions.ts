"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsPublisher } from "@/lib/cms-access";
import { homepagePublicFallback, type HomepagePublicSectionKey } from "@/lib/homepage-public-content";
import { prisma } from "@/lib/prisma";

const sectionKeys: HomepagePublicSectionKey[] = ["hero", "roles", "passport", "why", "footer"];

type ExistingRow = { contentKey: string };

function adoptionValue(key: HomepagePublicSectionKey) {
  const value = homepagePublicFallback[key];
  if (key !== "footer") return value;

  // Footer sloganındaki kalın vurgu ve copyright satırındaki yasal link barı
  // mevcut public markup tarafından korunur. İlk devralma yalnız CMS sahipliğini
  // oluşturur; bu iki alan kullanıcı açıkça düzenleyip yayınlayana kadar hydrate edilmez.
  return { supportEmail: value.supportEmail };
}

export async function adoptHomepageFallbackAction() {
  const access = await requireCmsPublisher("/icerik/ana-sayfa?dil=tr");
  const userId = access.user!.id;

  const existingRows = await prisma.$queryRaw<ExistingRow[]>`
    SELECT contentKey
    FROM SiteContent
    WHERE namespace = 'homepage'
      AND contentKey IN ('hero', 'roles', 'passport', 'why', 'footer')
  `;
  const existing = new Set(existingRows.map((row) => row.contentKey));
  let created = 0;

  for (const key of sectionKeys) {
    if (existing.has(key)) continue;
    const valueJson = JSON.stringify(adoptionValue(key));
    await prisma.$executeRaw`
      INSERT INTO SiteContent (
        id, namespace, contentKey, valueJson, valueType, status,
        publishedAt, updatedById, createdAt, updatedAt
      ) VALUES (
        ${randomUUID()}, 'homepage', ${key}, ${valueJson}, 'json', 'published',
        CURRENT_TIMESTAMP(3), ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
    `;
    created += 1;
  }

  revalidatePath("/");
  revalidatePath("/icerik");
  revalidatePath("/icerik/ana-sayfa");
  revalidatePath("/icerik/saglik");
  redirect(`/icerik/ana-sayfa?dil=tr&devralindi=${created}`);
}
