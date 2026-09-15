import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getCmsAccess } from "@/lib/cms-access";
import {
  EDITOR_EDUCATION_GUIDE_NAMESPACE,
  editorEducationGithubMediaFolder,
  editorEducationGuideDefault,
  editorEducationMediaFolder,
  getEditorEducationGuideRecord,
} from "@/lib/cms-editor-education";
import {
  detectAllowedMediaMime,
  MAX_CMS_MEDIA_BYTES,
  mediaKindForMime,
  sanitizeMediaFilename,
} from "@/lib/cms-media";
import {
  EDITOR_EDUCATION_VISUAL_SLOTS,
  editorEducationPublicPath,
  getEditorEducationCategory,
} from "@/lib/editor-education";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest, sameOriginRequestUrl } from "@/lib/same-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function back(request: Request, categorySlug: string, query: string) {
  return NextResponse.redirect(sameOriginRequestUrl(request, `/icerik/editor-egitim/${categorySlug}?${query}`), 303);
}

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function positiveInteger(formData: FormData, key: string) {
  const raw = text(formData, key, 8);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 && value <= 20000 ? value : undefined;
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
    return NextResponse.redirect(sameOriginRequestUrl(request, "/icerik/editor-egitim?hata=editor-form"), 303);
  }

  const categorySlug = text(formData, "categorySlug", 100);
  const slot = text(formData, "slot", 40);
  const category = getEditorEducationCategory(categorySlug);
  const slotInfo = EDITOR_EDUCATION_VISUAL_SLOTS.find((item) => item.key === slot);
  if (!category || !slotInfo) {
    return NextResponse.redirect(sameOriginRequestUrl(request, "/icerik/editor-egitim?hata=editor-hedef"), 303);
  }

  const entry = formData.get("file");
  if (!(entry instanceof File) || entry.size <= 0) return back(request, category.slug, "hata=dosya");
  if (entry.size > MAX_CMS_MEDIA_BYTES) return back(request, category.slug, "hata=boyut");

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await entry.arrayBuffer());
  } catch {
    return back(request, category.slug, "hata=okuma");
  }

  const detectedMime = detectAllowedMediaMime(bytes);
  if (!detectedMime || mediaKindForMime(detectedMime) !== "image") return back(request, category.slug, "hata=tip");

  const sourceWidth = positiveInteger(formData, "sourceWidth");
  const sourceHeight = positiveInteger(formData, "sourceHeight");
  if (!sourceWidth || !sourceHeight) return back(request, category.slug, "hata=olcu");
  if (sourceWidth < slotInfo.recommendedWidth || sourceHeight < slotInfo.recommendedHeight) {
    return back(request, category.slug, "hata=cozunurluk");
  }
  const targetRatio = slotInfo.recommendedWidth / slotInfo.recommendedHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  if (Math.abs(sourceRatio - targetRatio) / targetRatio > 0.015) {
    return back(request, category.slug, "hata=oran");
  }

  const id = randomUUID();
  const filename = sanitizeMediaFilename(entry.name);
  const altText = text(formData, "altText", 300) || `${category.title} · ${slotInfo.label}`;
  const url = `/api/media/${id}`;
  const base64 = Buffer.from(bytes).toString("base64");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const folder = editorEducationMediaFolder(category);
  const githubSourceFolder = editorEducationGithubMediaFolder(category);
  const current = await getEditorEducationGuideRecord(category.slug) ?? editorEducationGuideDefault(category);
  const guidePayload = JSON.stringify({
    ...current,
    visuals: {
      ...current.visuals,
      [slotInfo.key]: {
        url,
        altText,
        filename,
        mediaId: id,
        sourceWidth,
        sourceHeight,
        recommendedWidth: slotInfo.recommendedWidth,
        recommendedHeight: slotInfo.recommendedHeight,
        aspectRatio: slotInfo.aspectRatio,
        fit: slotInfo.fit,
        folder,
      },
    },
  });

  const assetPayload = JSON.stringify({
    id,
    title: `${category.title} · ${slotInfo.number} ${slotInfo.label}`,
    url,
    altText,
    kind: "image",
    collection: "editor-education",
    folder,
    githubSourceFolder,
    editorEducationSlug: category.slug,
    slot: slotInfo.key,
    slotNumber: slotInfo.number,
    sourceWidth,
    sourceHeight,
    recommendedWidth: slotInfo.recommendedWidth,
    recommendedHeight: slotInfo.recommendedHeight,
    aspectRatio: slotInfo.aspectRatio,
    fit: slotInfo.fit,
    sha256,
    automation: slotInfo.automation,
    usage: `Editör Eğitimi / ${category.title} / ${slotInfo.number} ${slotInfo.label}`,
    notes: `Orijinal dosya byte düzeyinde saklanır; resize, crop, sıkıştırma ve format dönüşümü yapılmaz. Hedef: ${slotInfo.recommendedWidth}x${slotInfo.recommendedHeight} · ${slotInfo.aspectRatio}.`,
    filename,
    mimeType: detectedMime,
    sizeBytes: entry.size,
    storage: "database",
    uploadedBy: access.user.displayName || access.user.fullName,
  });
  const blobPayload = JSON.stringify({ id, filename, mimeType: detectedMime, sizeBytes: entry.size, sha256, base64 });

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
          ${randomUUID()}, ${EDITOR_EDUCATION_GUIDE_NAMESPACE}, ${category.slug}, ${guidePayload}, 'json', 'published', CURRENT_TIMESTAMP(3),
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
    return back(request, category.slug, "hata=kayit");
  }

  const response = back(request, category.slug, `yuklendi=${slotInfo.key}`);
  response.headers.set("x-editor-education-public-path", editorEducationPublicPath(category));
  response.headers.set("x-editor-education-media-folder", folder);
  return response;
}
