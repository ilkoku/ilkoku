import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type Row = { id: string; pageId: string; version: number; createdAt: Date };

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
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
