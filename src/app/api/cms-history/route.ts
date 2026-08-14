import { NextResponse } from "next/server";
import { getCmsAccess } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

type Row = { id: string; pageId: string; version: number; createdAt: Date };

export async function GET() {
  const access = await getCmsAccess();
  if (!access.canManage) {
    return NextResponse.json({ items: [] }, { status: 403 });
  }

  try {
    const items = await prisma.$queryRaw<Row[]>`
      SELECT id, pageId, version, createdAt
      FROM ContentRevision
      ORDER BY createdAt DESC
      LIMIT 250
    `;
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
