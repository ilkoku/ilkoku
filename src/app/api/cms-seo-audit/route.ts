import { NextResponse } from "next/server";
import { getCmsAccess } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

type Row = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
};

export async function GET() {
  const access = await getCmsAccess();
  if (!access.canManage) return NextResponse.json({ error: "CMS_ACCESS_REQUIRED" }, { status: 403 });

  try {
    const pages = await prisma.$queryRaw<Row[]>`
      SELECT id, contentKey, slug, title, status, seoTitle, seoDescription, canonicalUrl, noIndex
      FROM ContentPage
      WHERE status = 'published'
        AND contentKey NOT LIKE 'legal:en:%'
        AND contentKey NOT LIKE 'guide:en:%'
        AND contentKey NOT LIKE 'page:en:%'
      ORDER BY updatedAt DESC
      LIMIT 250
    `;
    return NextResponse.json({ pages });
  } catch {
    return NextResponse.json({ error: "CMS_SEO_AUDIT_READ_FAILED" }, { status: 500 });
  }
}
