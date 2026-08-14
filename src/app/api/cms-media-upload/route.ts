import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsAccess } from "@/lib/cms-access";
import {
  detectAllowedMediaMime,
  MAX_CMS_MEDIA_BYTES,
  mediaKindForMime,
  sanitizeMediaFilename,
} from "@/lib/cms-media";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/same-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function back(request: Request, query: string) {
  return NextResponse.redirect(new URL(`/icerik/medya?${query}`, request.url), 303);
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
    return back(request, "hata=form");
  }

  const entry = formData.get("file");
  if (!(entry instanceof File) || entry.size <= 0) return back(request, "hata=dosya");
  if (entry.size > MAX_CMS_MEDIA_BYTES) return back(request, "hata=boyut");

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await entry.arrayBuffer());
  } catch {
    return back(request, "hata=okuma");
  }

  const detectedMime = detectAllowedMediaMime(bytes);
  if (!detectedMime) return back(request, "hata=tip");

  const kind = mediaKindForMime(detectedMime);
  if (!kind) return back(request, "hata=tip");

  const id = randomUUID();
  const filename = sanitizeMediaFilename(entry.name);
  const title = text(formData, "title", 180) || filename;
  const altText = text(formData, "altText", 300);
  const usage = text(formData, "usage", 180);
  const notes = text(formData, "notes", 800);
  const url = `/api/media/${id}`;
  const base64 = Buffer.from(bytes).toString("base64");

  const assetPayload = JSON.stringify({
    id,
    title,
    url,
    altText,
    kind,
    usage,
    notes,
    filename,
    mimeType: detectedMime,
    sizeBytes: entry.size,
    storage: "database",
    uploadedBy: access.user.displayName || access.user.fullName,
  });

  const blobPayload = JSON.stringify({
    id,
    filename,
    mimeType: detectedMime,
    sizeBytes: entry.size,
    base64,
  });

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
    ]);
  } catch {
    return back(request, "hata=kayit");
  }

  return back(request, "yuklendi=1");
}
