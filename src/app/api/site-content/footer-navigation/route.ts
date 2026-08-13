import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'site'
        AND contentKey = 'footer_navigation'
        AND status = 'published'
      LIMIT 1
    `;

    if (!rows[0]?.valueJson) {
      return NextResponse.json({ content: null });
    }

    const raw = JSON.parse(rows[0].valueJson) as Record<string, unknown>;
    const content: Record<string, string> = {};

    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "string") content[key] = value.trim();
    }

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: null });
  }
}
