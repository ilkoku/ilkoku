import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string };

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson
      FROM SiteContent
      WHERE namespace = 'faq' AND status = 'published'
      ORDER BY updatedAt ASC
      LIMIT 300
    `;

    const items = rows.map((row) => {
      try { return JSON.parse(row.valueJson); } catch { return null; }
    }).filter(Boolean);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
