import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type HeroRow = {
  valueJson: string;
};

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<HeroRow[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'homepage'
        AND contentKey = 'hero'
        AND status = 'published'
      LIMIT 1
    `;

    if (!rows[0]?.valueJson) {
      return NextResponse.json({ content: null });
    }

    const parsed = JSON.parse(rows[0].valueJson) as {
      title?: unknown;
      description?: unknown;
    };

    if (
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string" ||
      !parsed.title.trim() ||
      !parsed.description.trim()
    ) {
      return NextResponse.json({ content: null });
    }

    return NextResponse.json({
      content: {
        title: parsed.title.trim(),
        description: parsed.description.trim(),
      },
    });
  } catch {
    return NextResponse.json({ content: null });
  }
}
