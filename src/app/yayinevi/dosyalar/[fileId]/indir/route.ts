import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getLegacyPublisherFileForDownload } from "@/features/publisher-submissions/legacy-security";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Oturum gerekli." }, { status: 401 });
  const { fileId } = await context.params;
  const file = await getLegacyPublisherFileForDownload(user.id, fileId);
  if (!file) return NextResponse.json({ message: "Dosya bulunamadı." }, { status: 404 });
  try {
    const destination = new URL(file.storageUrl);
    if (!["https:", "http:"].includes(destination.protocol)) throw new Error("UNSUPPORTED_PROTOCOL");
    return NextResponse.redirect(destination, {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "Dosya adresi geçersiz." }, { status: 410 });
  }
}
