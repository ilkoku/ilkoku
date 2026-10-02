import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string; updatedAt: Date };
type Notice = {
  title?: string;
  body?: string;
  audience?: string;
  level?: string;
  startsAt?: string | null;
  endsAt?: string | null;
};

function istanbulTime(value: string | null | undefined) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+03:00` : value;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export async function GET() {
  const user = await getCurrentUser();
  const role = user?.role === "editor_pending" ? "editor" : user?.role;
  const now = Date.now();

  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson, updatedAt
      FROM SiteContent
      WHERE namespace = 'announcement' AND status = 'published'
      ORDER BY updatedAt DESC
      LIMIT 50
    `;

    const items = rows.flatMap((row) => {
      let data: Notice;
      try { data = JSON.parse(row.valueJson) as Notice; } catch { return []; }

      const audience = data.audience || "all";
      if (audience !== "all" && audience !== role) return [];

      const startsAt = istanbulTime(data.startsAt);
      const endsAt = istanbulTime(data.endsAt);
      if (startsAt !== null && now < startsAt) return [];
      if (endsAt !== null && now > endsAt) return [];
      if (!data.title || !data.body) return [];

      return [{ key: row.contentKey, title: data.title, body: data.body, level: data.level || "info" }];
    });

    return NextResponse.json({ items: items.slice(0, 3) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
