import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };
type FaqItem = {
  id?: string;
  question?: string;
  answer?: string;
  category?: string;
  audience?: string;
  position?: number;
};

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'faq'
        AND status = 'published'
      ORDER BY updatedAt ASC
      LIMIT 300
    `;

    const items = rows
      .map((row) => {
        try {
          return JSON.parse(row.valueJson) as FaqItem;
        } catch {
          return null;
        }
      })
      .filter((item): item is FaqItem => Boolean(item?.question && item?.answer))
      .sort((a, b) => {
        const positionDiff = (a.position ?? 0) - (b.position ?? 0);
        if (positionDiff !== 0) return positionDiff;
        return (a.category || "Genel").localeCompare(b.category || "Genel", "tr");
      });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
