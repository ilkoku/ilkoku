import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Row = { id: string; slug: string; title: string; status: string; seoTitle: string | null; seoDescription: string | null; canonicalUrl: string | null; noIndex: boolean };

export async function GET() {
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
