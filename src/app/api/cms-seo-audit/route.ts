import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type Row = { id: string; slug: string; title: string; status: string; seoTitle: string | null; seoDescription: string | null; canonicalUrl: string | null; noIndex: boolean };

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ pages: [] }, { status: 403 });

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
