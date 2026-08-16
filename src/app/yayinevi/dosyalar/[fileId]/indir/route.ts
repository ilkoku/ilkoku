import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getPublisherFileForDownload,
  getPublisherMembership,
} from "@/features/publisher-workspace/repository";
import { auditPublisherFileDownload } from "@/features/publisher-workspace/legacy-operations";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  const { fileId } = await context.params;
  const file = await getPublisherFileForDownload(user.id, fileId);
  if (!file) return NextResponse.json({ message: "Dosya bulunamadı." }, { status: 404 });

  try {
    const destination = new URL(file.storageUrl);
    if (!["https:", "http:"].includes(destination.protocol)) throw new Error("UNSUPPORTED_PROTOCOL");

    const membership = await getPublisherMembership(user.id);
    if (!membership) {
      return NextResponse.json({ message: "Dosya erişimi doğrulanamadı." }, { status: 403 });
    }

    await auditPublisherFileDownload({
      fileId,
      publisherId: membership.publisherId,
      userId: user.id,
    });

    return NextResponse.redirect(destination, { status: 307 });
  } catch (error) {
    console.error("PUBLISHER_FILE_DOWNLOAD_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      fileId,
      userId: user.id,
    });
    return NextResponse.json({ message: "Dosya adresi geçersiz veya erişim kaydı oluşturulamadı." }, { status: 410 });
  }
}
