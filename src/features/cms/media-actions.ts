"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import { parseCmsMediaAssetMetadata } from "@/lib/cms-media";
import { isCmsMediaReferencedByPublishedContent } from "@/lib/cms-media-references";
import { prisma } from "@/lib/prisma";

function value(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function safeMediaUrl(input: string) {
  if (!input.startsWith("/")) return "";
  if (input.startsWith("//")) return "";
  return input.replace(/[\r\n]/g, "").slice(0, 500);
}

async function getActiveMediaAsset(contentKey: string) {
  const assetRows = await prisma.$queryRaw<Array<{ valueJson: string }>>`
    SELECT valueJson
    FROM SiteContent
    WHERE namespace = 'media'
      AND contentKey = ${contentKey}
      AND status <> 'archived'
    LIMIT 1
  `;

  const asset = assetRows[0] ? parseCmsMediaAssetMetadata(assetRows[0].valueJson) : null;
  return asset ? { asset, assetId: contentKey.slice("asset_".length) } : null;
}

function revalidateMediaPaths() {
  revalidatePath("/icerik");
  revalidatePath("/icerik/medya");
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

  revalidateMediaPaths();
}

export async function archiveMediaAssetAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/medya");
  const contentKey = value(formData, "contentKey", 200);
  const returnTo = value(formData, "returnTo", 30);
  if (!contentKey.startsWith("asset_")) return;

  const target = await getActiveMediaAsset(contentKey);
  if (!target) return;

  if (await isCmsMediaReferencedByPublishedContent(target.asset.url)) {
    redirect("/icerik/medya?hata=kullanimda");
  }

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'archived', updatedById = ${user!.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'media' AND contentKey = ${contentKey}
    `,
    prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'archived', updatedById = ${user!.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'media_blob' AND contentKey = ${`blob_${target.assetId}`}
    `,
  ]);

  revalidateMediaPaths();
  const anchor = returnTo === "education" ? "#egitim-medya" : "#cms-medya";
  redirect(`/icerik/medya?silindi=1${anchor}`);
}

export async function archiveEducationMediaAssetsAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/medya");
  const contentKeys = [...new Set(
    formData.getAll("contentKey")
      .map((entry) => String(entry).trim().slice(0, 200))
      .filter((entry) => entry.startsWith("asset_")),
  )].slice(0, 100);

  if (contentKeys.length === 0) {
    redirect("/icerik/medya#egitim-medya");
  }

  const targets: Array<{ contentKey: string; assetId: string }> = [];

  for (const contentKey of contentKeys) {
    const target = await getActiveMediaAsset(contentKey);
    if (!target || target.asset.collection !== "education") {
      redirect("/icerik/medya?hata=metadata#egitim-medya");
    }

    if (await isCmsMediaReferencedByPublishedContent(target.asset.url)) {
      redirect("/icerik/medya?hata=kullanimda#egitim-medya");
    }

    targets.push({ contentKey, assetId: target.assetId });
  }

  const operations = targets.flatMap(({ contentKey, assetId }) => [
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

  await prisma.$transaction(operations);

  revalidateMediaPaths();
  redirect("/icerik/medya?silindi=1#egitim-medya");
}
