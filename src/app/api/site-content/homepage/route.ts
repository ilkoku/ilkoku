import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string };

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson
      FROM SiteContent
      WHERE namespace = 'homepage'
        AND status = 'published'
    `;

    const allowed = new Set(["hero", "roles", "passport", "why", "footer"]);
    const content: Record<string, Record<string, string>> = {};

    for (const row of rows) {
      if (!allowed.has(row.contentKey)) continue;
      try {
        const raw = JSON.parse(row.valueJson) as Record<string, unknown>;
        const clean: Record<string, string> = {};
        for (const [key, value] of Object.entries(raw)) {
          if (typeof value === "string") clean[key] = value.trim();
        }
        content[row.contentKey] = clean;
      } catch {}
    }

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: {} });
  }
}
