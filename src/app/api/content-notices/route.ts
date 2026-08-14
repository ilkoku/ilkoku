import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsAccess } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/same-origin";

const keyPattern = /^notice_[0-9a-f-]{36}$/i;
const audiences = new Set(["all", "reader", "writer", "editor", "publisher"]);
const levels = new Set(["info", "warning", "maintenance"]);

function back(request: Request, durum: string) {
  return NextResponse.redirect(new URL(`/icerik/duyurular?durum=${durum}`, request.url), 303);
}

function text(form: FormData, name: string, max: number) {
  return String(form.get(name) ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const access = await getCmsAccess();
  if (!access.user || !access.canManage || !isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const form = await request.formData();
  const action = text(form, "action", 40);

  if (action === "create") {
    const title = text(form, "title", 180);
    const body = text(form, "body", 2400);
    const audienceRaw = text(form, "audience", 40);
    const levelRaw = text(form, "level", 40);
    const startsAt = text(form, "startsAt", 32);
    const endsAt = text(form, "endsAt", 32);
    const publishNow = form.get("publishNow") === "1";

    if (!title || !body) return back(request, "eksik");
    if (publishNow && !access.canPublish) return back(request, "yayin-yetkisi-yok");

    const id = randomUUID();
    const status = publishNow ? "published" : "draft";
    const audience = audiences.has(audienceRaw) ? audienceRaw : "all";
    const level = levels.has(levelRaw) ? levelRaw : "info";
    const payload = JSON.stringify({
      id,
      title,
      body,
      audience,
      level,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      timezone: "Europe/Istanbul",
    });

    await prisma.$executeRaw`
      INSERT INTO SiteContent (
        id, namespace, contentKey, valueJson, valueType, status,
        publishedAt, updatedById, createdAt, updatedAt
      ) VALUES (
        ${id}, 'announcement', ${`notice_${id}`}, ${payload}, 'json', ${status},
        ${publishNow ? new Date() : null}, ${access.user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
    `;

    return back(request, publishNow ? "yayinda" : "taslak");
  }

  const key = text(form, "key", 80);
  if (!keyPattern.test(key)) return back(request, "gecersiz");

  if (action === "publish") {
    if (!access.canPublish) return back(request, "yayin-yetkisi-yok");
    await prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'published', publishedAt = CURRENT_TIMESTAMP(3),
          updatedById = ${access.user.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'announcement' AND contentKey = ${key}
    `;
    return back(request, "yayinda");
  }

  if (action === "unpublish") {
    if (!access.canPublish) return back(request, "yayin-yetkisi-yok");
    await prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'draft', publishedAt = NULL,
          updatedById = ${access.user.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'announcement' AND contentKey = ${key}
    `;
    return back(request, "taslak");
  }

  if (action === "archive") {
    await prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'archived', updatedById = ${access.user.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'announcement' AND contentKey = ${key}
    `;
    return back(request, "arsiv");
  }

  return back(request, "gecersiz");
}
