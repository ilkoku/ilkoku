import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/same-origin";

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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ ok: false }, { status: 403 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false }, { status: 403 });

  const formData = await request.formData();
  const question = String(formData.get("question") ?? "").trim().slice(0, 300);
  const answer = String(formData.get("answer") ?? "").trim().slice(0, 4000);
  if (!question || !answer) return NextResponse.redirect(new URL("/icerik/sss", request.url));

  const id = randomUUID();
  const payload = JSON.stringify({
    id,
    question,
    answer,
    category: String(formData.get("category") ?? "Genel").trim().slice(0, 80) || "Genel",
    audience: String(formData.get("audience") ?? "all").trim().slice(0, 40) || "all",
    position: Number.parseInt(String(formData.get("position") ?? "0"), 10) || 0,
  });

  await prisma.$executeRaw`
    INSERT INTO SiteContent (id, namespace, contentKey, valueJson, valueType, status, updatedById, createdAt, updatedAt)
    VALUES (${id}, 'faq', ${`item_${id}`}, ${payload}, 'json', 'published', ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
  `;

  return NextResponse.redirect(new URL("/icerik/sss", request.url), 303);
}
