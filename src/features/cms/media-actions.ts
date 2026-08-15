"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

function value(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function safeMediaUrl(input: string) {
  if (!input.startsWith("/")) return "";
  if (input.startsWith("//")) return "";
  return input.replace(/[\r\n]/g, "").slice(0, 500);
}

export async function createMediaAssetAction(formData: FormData) {
  const { user } = await requireCmsManager("/icerik/medya");
  const id = randomUUID();
  const mediaUrl = safeMediaUrl(value(formData, "url"));
  const title = value(formData, "title", 180);
  if (!mediaUrl || !title) return;

  const payload = JSON.stringify({
    id,
    title,
    url: mediaUrl,
    altText: value(formData, "altText", 300),
    kind: value(formData, "kind", 40) || "image",
    usage: value(formData, "usage", 180),
    notes: value(formData, "notes", 800),
    storage: "public-path",
    uploadedBy: user!.displayName || user!.fullName,
  });

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      updatedById, createdAt, updatedAt
    ) VALUES (
      ${id}, 'media', ${`asset_${id}`}, ${payload}, 'json', 'published',
      ${user!.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
  `;

  revalidatePath("/icerik");
  revalidatePath("/icerik/medya");
}

export async function archiveMediaAssetAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/medya");
  const contentKey = value(formData, "contentKey", 200);
  if (!contentKey.startsWith("asset_")) return;

  const assetId = contentKey.slice("asset_".length);

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'archived', updatedById = ${user!.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'media' AND contentKey = ${contentKey}
    `,
    prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'archived', updatedById = ${user!.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'media_blob' AND contentKey = ${`blob_${assetId}`}
    `,
  ]);

  revalidatePath("/icerik");
  revalidatePath("/icerik/medya");
}
