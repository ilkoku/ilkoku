import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsAccess } from "@/lib/cms-access";
import {
  EDUCATION_GUIDE_NAMESPACE,
  EDUCATION_VISUAL_SLOTS,
  educationGuideDefault,
  educationPublicPath,
  getEducationGuideRecord,
  isEducationVisualSlotKey,
} from "@/lib/cms-education";
import {
  detectAllowedMediaMime,
  MAX_CMS_MEDIA_BYTES,
  mediaKindForMime,
  sanitizeMediaFilename,
} from "@/lib/cms-media";
import { getGenreBySlug } from "@/lib/genres";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/same-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function back(request: Request, genreSlug: string, query: string) {
  return NextResponse.redirect(new URL(`/icerik/egitim/${genreSlug}?${query}`, request.url), 303);
}

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return new Response("Forbidden", { status: 403 });

  const access = await getCmsAccess();
  if (!access.user) return new Response("Unauthorized", { status: 401 });
  if (!access.canManage) return new Response("Forbidden", { status: 403 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.redirect(new URL("/icerik/egitim?hata=form", request.url), 303);
  }

  const genreSlug = text(formData, "genreSlug", 100);
  const slot = text(formData, "slot", 40);
  const genre = getGenreBySlug(genreSlug);
  if (!genre || !isEducationVisualSlotKey(slot)) {
    return NextResponse.redirect(new URL("/icerik/egitim?hata=hedef", request.url), 303);
  }

  const entry = formData.get("file");
  if (!(entry instanceof File) || entry.size <= 0) return back(request, genre.slug, "hata=dosya");
  if (entry.size > MAX_CMS_MEDIA_BYTES) return back(request, genre.slug, "hata=boyut");

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await entry.arrayBuffer());
  } catch {
    return back(request, genre.slug, "hata=okuma");
  }

  const detectedMime = detectAllowedMediaMime(bytes);
  if (!detectedMime || mediaKindForMime(detectedMime) !== "image") return back(request, genre.slug, "hata=tip");

  const slotInfo = EDUCATION_VISUAL_SLOTS.find((item) => item.key === slot)!;
  const id = randomUUID();
  const filename = sanitizeMediaFilename(entry.name);
  const altText = text(formData, "altText", 300) || `${genre.label} · ${slotInfo.label}`;
  const url = `/api/media/${id}`;
  const base64 = Buffer.from(bytes).toString("base64");
  const current = await getEducationGuideRecord(genre.slug) ?? educationGuideDefault(genre);
  const guidePayload = JSON.stringify({
    ...current,
    visuals: {
      ...current.visuals,
      [slot]: { url, altText, filename, mediaId: id },
    },
  });

  const assetPayload = JSON.stringify({
    id,
    title: `${genre.label} · ${slotInfo.number} ${slotInfo.label}`,
    url,
    altText,
    kind: "image",
    usage: `Eğitim / ${genre.category} / ${genre.label} / ${slotInfo.number} ${slotInfo.label}`,
    notes: `Eğitim modülünden ${genre.slug} sayfasının ${slot} slotuna yüklendi.`,
    filename,
    mimeType: detectedMime,
    sizeBytes: entry.size,
    storage: "database",
    uploadedBy: access.user.displayName || access.user.fullName,
  });

  const blobPayload = JSON.stringify({ id, filename, mimeType: detectedMime, sizeBytes: entry.size, base64 });

  try {
    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO SiteContent (
          id, namespace, contentKey, valueJson, valueType, status, publishedAt,
          updatedById, createdAt, updatedAt
        ) VALUES (
          ${randomUUID()}, 'media', ${`asset_${id}`}, ${assetPayload}, 'json', 'published', CURRENT_TIMESTAMP(3),
          ${access.user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
        )
      `,
      prisma.$executeRaw`
        INSERT INTO SiteContent (
          id, namespace, contentKey, valueJson, valueType, status, publishedAt,
          updatedById, createdAt, updatedAt
        ) VALUES (
          ${randomUUID()}, 'media_blob', ${`blob_${id}`}, ${blobPayload}, 'base64', 'published', CURRENT_TIMESTAMP(3),
          ${access.user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
        )
      `,
      prisma.$executeRaw`
        INSERT INTO SiteContent (
          id, namespace, contentKey, valueJson, valueType, status, publishedAt,
          updatedById, createdAt, updatedAt
        ) VALUES (
          ${randomUUID()}, ${EDUCATION_GUIDE_NAMESPACE}, ${genre.slug}, ${guidePayload}, 'json', 'published', CURRENT_TIMESTAMP(3),
          ${access.user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
        )
        ON DUPLICATE KEY UPDATE
          valueJson = VALUES(valueJson),
          status = 'published',
          publishedAt = CURRENT_TIMESTAMP(3),
          updatedById = VALUES(updatedById),
          updatedAt = CURRENT_TIMESTAMP(3)
      `,
    ]);
  } catch {
    return back(request, genre.slug, "hata=kayit");
  }

  const response = back(request, genre.slug, `yuklendi=${slot}`);
  response.headers.set("x-education-public-path", educationPublicPath(genre));
  return response;
}
