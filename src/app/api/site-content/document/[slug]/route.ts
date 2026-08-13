import { NextResponse } from "next/server";
import { getCmsLegalDocument } from "@/lib/cms-legal";
import { prisma } from "@/lib/prisma";

type PageRow = {
  title: string;
  bodyJson: string;
  seoDescription: string | null;
};

type PageProps = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: PageProps) {
  const { slug } = await params;
  const document = getCmsLegalDocument(slug);
  if (!document) return NextResponse.json({ content: null }, { status: 404 });

  try {
    const rows = await prisma.$queryRaw<PageRow[]>`
      SELECT title, bodyJson, seoDescription
      FROM ContentPage
      WHERE contentKey = ${document.key}
        AND status = 'published'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return NextResponse.json({ content: null });

    const body = JSON.parse(row.bodyJson) as Record<string, unknown>;
    return NextResponse.json({
      content: {
        title: row.title,
        description: typeof body.description === "string" ? body.description : row.seoDescription ?? "",
        updatedLabel: typeof body.updatedLabel === "string" ? body.updatedLabel : "",
        body: typeof body.body === "string" ? body.body : "",
      },
    });
  } catch {
    return NextResponse.json({ content: null });
  }
}
