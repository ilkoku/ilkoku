import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { authorizeAuditedPublisherFileDownload } from "@/features/publisher-submissions/file-download";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });

  const { fileId } = await context.params;
  const result = await authorizeAuditedPublisherFileDownload({
    fileId,
    userId: user.id,
  });

  if (result.status === "forbidden") {
    return NextResponse.json({ message: "Dosya indirme yetkiniz yok." }, { status: 403 });
  }

  if (result.status === "not_found") {
    return NextResponse.json({ message: "Dosya bulunamadı." }, { status: 404 });
  }

  if (result.status === "invalid_url") {
    return NextResponse.json({ message: "Dosya adresi geçersiz." }, { status: 410 });
  }

  return NextResponse.redirect(result.destination, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
