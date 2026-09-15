"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  detectAllowedMediaMime,
  MAX_CMS_MEDIA_BYTES,
  mediaKindForMime,
  sanitizeMediaFilename,
} from "@/lib/cms-media";
import { prisma } from "@/lib/prisma";

import {
  createBookSectionAction,
  saveBookSectionAction,
} from "./book-structure-actions";
import { worksRepository } from "./repository";
import { writerMetadataSchema, workIdSchema } from "./validators";

async function authenticatedWriter() {
  const user = await getCurrentUser();

  if (!user || user.role !== "writer") {
    throw new Error("Bu işlem için yazar hesabınla giriş yapmalısın.");
  }

  return user;
}

function revalidateWorkManagement(slug: string) {
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
  revalidatePath(`/kitap/${slug}`);
  revalidatePath(`/kitap/${slug}/duzenle`);
  revalidatePath("/kesfet");
  revalidatePath("/eserler");
  revalidatePath("/okuyucu");
  revalidatePath("/yazarlar");
}

function uploadedMediaId(url: string | null) {
  const match = url?.match(/^\/api\/media\/([0-9a-f-]{36})$/iu);
  return match?.[1] ?? null;
}

async function removeOwnedCoverMedia(
  writerId: string,
  coverUrl: string | null,
) {
  const mediaId = uploadedMediaId(coverUrl);
  if (!mediaId || !coverUrl) return;

  const stillUsed = await prisma.work.count({
    where: {
      coverUrl,
    },
  });

  if (stillUsed > 0) return;

  await prisma.$executeRaw`
    DELETE FROM SiteContent
    WHERE updatedById = ${writerId}
      AND (
        (namespace = 'media' AND contentKey = ${`asset_${mediaId}`})
        OR
        (namespace = 'media_blob' AND contentKey = ${`blob_${mediaId}`})
      )
  `;
}

export async function updateAuthorWorkBasicsAction(formData: FormData) {
  const writer = await authenticatedWriter();
  const parsed = writerMetadataSchema.safeParse({
    id: formData.get("workId"),
    title: formData.get("title"),
    genre: formData.get("genre"),
    summary: formData.get("summary"),
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Eser bilgileri doğrulanamadı.",
    );
  }

  const languageValue = String(formData.get("language") ?? "tr").trim();
  const language = languageValue === "en" ? "en" : "tr";

  const updated = await worksRepository.updateWork(writer.id, parsed.data.id, {
    description: parsed.data.summary ?? null,
    genre: parsed.data.genre ?? null,
    language,
    title: parsed.data.title,
  });

  revalidateWorkManagement(updated.slug);
}

export async function uploadAuthorCoverAction(formData: FormData) {
  const writer = await authenticatedWriter();
  const parsed = workIdSchema.safeParse({
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    throw new Error("Geçerli bir eser seçilmelidir.");
  }

  const work = await worksRepository.getAuthorWorkById(writer.id, parsed.data.workId);
  if (!work) {
    throw new Error("Eser bulunamadı veya kapağı değiştirme yetkin yok.");
  }

  const entry = formData.get("cover");
  if (!(entry instanceof File) || entry.size <= 0) {
    throw new Error("Kapak görseli seçmelisin.");
  }

  if (entry.size > MAX_CMS_MEDIA_BYTES) {
    throw new Error("Kapak görseli en fazla 3 MB olabilir.");
  }

  const bytes = new Uint8Array(await entry.arrayBuffer());
  const detectedMime = detectAllowedMediaMime(bytes);

  if (!detectedMime || mediaKindForMime(detectedMime) !== "image") {
    throw new Error("Kapak için geçerli bir görsel dosyası seçmelisin.");
  }

  const mediaId = randomUUID();
  const filename = sanitizeMediaFilename(entry.name);
  const url = `/api/media/${mediaId}`;
  const base64 = Buffer.from(bytes).toString("base64");
  const assetPayload = JSON.stringify({
    id: mediaId,
    title: `${work.title} kapak görseli`,
    url,
    altText: `${work.title} kapak görseli`,
    kind: "image",
    usage: "Eser kapağı",
    filename,
    mimeType: detectedMime,
    sizeBytes: entry.size,
    storage: "database",
    uploadedBy: writer.displayName || writer.fullName,
    collection: "work-cover",
    workId: work.id,
  });
  const blobPayload = JSON.stringify({
    id: mediaId,
    filename,
    mimeType: detectedMime,
    sizeBytes: entry.size,
    base64,
  });

  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO SiteContent (
        id, namespace, contentKey, valueJson, valueType, status, publishedAt,
        updatedById, createdAt, updatedAt
      ) VALUES (
        ${randomUUID()}, 'media', ${`asset_${mediaId}`}, ${assetPayload}, 'json', 'published', CURRENT_TIMESTAMP(3),
        ${writer.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
    `;

    await transaction.$executeRaw`
      INSERT INTO SiteContent (
        id, namespace, contentKey, valueJson, valueType, status, publishedAt,
        updatedById, createdAt, updatedAt
      ) VALUES (
        ${randomUUID()}, 'media_blob', ${`blob_${mediaId}`}, ${blobPayload}, 'base64', 'published', CURRENT_TIMESTAMP(3),
        ${writer.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
    `;

    await transaction.work.update({
      where: { id: work.id },
      data: { coverUrl: url },
    });
  });

  if (work.coverUrl && work.coverUrl !== url) {
    await removeOwnedCoverMedia(writer.id, work.coverUrl);
  }

  revalidateWorkManagement(work.slug);
}

export async function removeAuthorCoverAction(formData: FormData) {
  const writer = await authenticatedWriter();
  const parsed = workIdSchema.safeParse({
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    throw new Error("Geçerli bir eser seçilmelidir.");
  }

  const work = await worksRepository.getAuthorWorkById(writer.id, parsed.data.workId);
  if (!work) {
    throw new Error("Eser bulunamadı veya kapağı silme yetkin yok.");
  }

  await worksRepository.updateWork(writer.id, work.id, { coverUrl: null });
  await removeOwnedCoverMedia(writer.id, work.coverUrl);
  revalidateWorkManagement(work.slug);
}

export async function setAuthorWorkActiveAction(formData: FormData) {
  const writer = await authenticatedWriter();
  const parsed = workIdSchema.safeParse({
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    throw new Error("Geçerli bir eser seçilmelidir.");
  }

  const updated = await worksRepository.updateWork(writer.id, parsed.data.workId, {
    isActive: formData.get("nextActive") === "true",
  });

  revalidateWorkManagement(updated.slug);
}

export async function addAuthorBookSectionAction(formData: FormData) {
  await authenticatedWriter();

  const workId = String(formData.get("workId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const result = await createBookSectionAction(workId, kind);

  if (result.status === "error") {
    throw new Error(result.message);
  }

  if (slug) {
    revalidateWorkManagement(slug);
  }
}

export async function saveAuthorBookSectionAction(formData: FormData) {
  await authenticatedWriter();

  const slug = String(formData.get("slug") ?? "");
  const result = await saveBookSectionAction({
    workId: String(formData.get("workId") ?? ""),
    itemId: String(formData.get("itemId") ?? ""),
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
  });

  if (result.status === "error") {
    throw new Error(result.message);
  }

  if (slug) {
    revalidateWorkManagement(slug);
  }
}
