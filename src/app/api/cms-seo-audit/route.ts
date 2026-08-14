import { NextResponse } from "next/server";
import { getCmsAccess } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

type Row = { id: string; slug: string; title: string; status: string; seoTitle: string | null; seoDescription: string | null; canonicalUrl: string | null; noIndex: boolean };

export async function GET() {
  const access = await getCmsAccess();
  if (!access.canManage) return NextResponse.json({ pages: [] }, { status: 403 });

  try {
    const pages = await prisma.$queryRaw<Row[]>`
      SELECT id, slug, title, status, seoTitle, seoDescription, canonicalUrl, noIndex
      FROM ContentPage
      ORDER BY updatedAt DESC
      LIMIT 250
    `;
    return NextResponse.json({ pages });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}
