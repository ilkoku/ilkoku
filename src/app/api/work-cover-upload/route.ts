import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { sanitizeMediaFilename } from "@/lib/cms-media";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/same-origin";
import {
  inspectWorkCover,
  MAX_WORK_COVER_BYTES,
  WORK_COVER_MIN_HEIGHT,
  WORK_COVER_MIN_WIDTH,
} from "@/lib/work-cover";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return jsonError("İstek doğrulanamadı.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Oturum bulunamadı.", 401);
  if (user.role !== "writer") return jsonError("Kapak yükleme yetkin yok.", 403);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Yükleme formu okunamadı.", 400);
  }

  const workId = String(formData.get("workId") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workId)) {
    return jsonError("Geçerli bir eser seçilmelidir.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return jsonError("Bir kapak görseli seçmelisin.", 400);
  }
  if (file.size > MAX_WORK_COVER_BYTES) {
    return jsonError("Kapak dosyası en fazla 3 MB olabilir.", 413);
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return jsonError("Kapak dosyası okunamadı.", 400);
  }

  const inspected = inspectWorkCover(bytes);
  if (!inspected.ok) return jsonError(inspected.message, 400);

  const id = randomUUID();
  const filename = sanitizeMediaFilename(file.name || "eser-kapagi");
  const url = `/api/media/${id}`;
  const base64 = Buffer.from(bytes).toString("base64");

  try {
    await prisma.$transaction(async (transaction) => {
      const work = await transaction.work.findFirst({
        where: {
          authorId: user.id,
          deletedAt: null,
          id: workId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!work) throw new Error("WORK_NOT_FOUND");

      const assetPayload = JSON.stringify({
        id,
        title: `${work.title} · kapak`,
        url,
        altText: `${work.title} kapak görseli`,
        kind: "image",
        usage: "Eser kapağı",
        filename,
        mimeType: inspected.mimeType,
        sizeBytes: file.size,
        storage: "database",
        uploadedBy: user.displayName || user.fullName,
        collection: "work_cover",
        workId,
        width: inspected.width,
        height: inspected.height,
      });
      const blobPayload = JSON.stringify({
        id,
        filename,
        mimeType: inspected.mimeType,
        sizeBytes: file.size,
        base64,
      });

      await transaction.$executeRaw`
        INSERT INTO SiteContent (
          id, namespace, contentKey, valueJson, valueType, status, publishedAt,
          updatedById, createdAt, updatedAt
        ) VALUES (
          ${randomUUID()}, 'media', ${`asset_${id}`}, ${assetPayload}, 'json', 'published', CURRENT_TIMESTAMP(3),
          ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
        )
      `;
      await transaction.$executeRaw`
        INSERT INTO SiteContent (
          id, namespace, contentKey, valueJson, valueType, status, publishedAt,
          updatedById, createdAt, updatedAt
        ) VALUES (
          ${randomUUID()}, 'media_blob', ${`blob_${id}`}, ${blobPayload}, 'base64', 'published', CURRENT_TIMESTAMP(3),
          ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
        )
      `;
      await transaction.work.update({
        where: { id: work.id },
        data: { coverUrl: url },
      });
    });
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.message === "WORK_NOT_FOUND") {
      return jsonError("Eser bulunamadı veya bu kapağı değiştirme yetkin yok.", 404);
    }
    console.error("WORK_COVER_UPLOAD_ERROR", caughtError);
    return jsonError("Kapak kaydedilemedi. Lütfen tekrar dene.", 500);
  }

  revalidatePath("/eserlerim");
  revalidatePath("/yazar");
  revalidatePath("/yazmaya-devam");

  return NextResponse.json({
    ok: true,
    message: "Kapak yüklendi.",
    url,
    width: inspected.width,
    height: inspected.height,
    requirements: {
      minWidth: WORK_COVER_MIN_WIDTH,
      minHeight: WORK_COVER_MIN_HEIGHT,
      ratio: "2:3",
      recommended: "1200×1800 px",
    },
  });
}
