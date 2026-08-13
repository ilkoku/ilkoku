import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string; status: string; updatedAt: Date };

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ items: [] }, { status: 403 });

  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'announcement'
      ORDER BY updatedAt DESC
      LIMIT 200
    `;
    const items = rows.map((row) => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(row.valueJson) as Record<string, unknown>; } catch {}
      return { key: row.contentKey, status: row.status, updatedAt: row.updatedAt, ...data };
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
