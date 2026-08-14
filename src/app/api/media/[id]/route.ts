import { parseStoredMediaBlob } from "@/lib/cms-media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BlobRow = { valueJson: string };

type RouteProps = {
  params: Promise<{ id: string }>;
};

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^\x20-\x7e]/g, "-").replace(/["\\]/g, "-");
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  let rows: BlobRow[] = [];
  try {
    rows = await prisma.$queryRaw<BlobRow[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'media_blob'
        AND contentKey = ${`blob_${id}`}
        AND status = 'published'
      LIMIT 1
    `;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const blob = rows[0] ? parseStoredMediaBlob(rows[0].valueJson) : null;
  if (!blob || blob.id !== id) return new Response("Not found", { status: 404 });

  let body: Buffer;
  try {
    body = Buffer.from(blob.base64, "base64");
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (body.length !== blob.sizeBytes) return new Response("Not found", { status: 404 });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": blob.mimeType,
      "Content-Length": String(body.length),
      "Content-Disposition": contentDisposition(blob.filename),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
