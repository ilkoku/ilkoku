import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { parseCmsSettings } from "@/lib/cms-settings";
import { prisma } from "@/lib/prisma";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || !sameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const form = await request.formData();
  const raw = JSON.stringify({
    defaultStatus: form.get("defaultStatus") === "published" ? "published" : "draft",
    revisionRetention: ["all", "50", "20"].includes(String(form.get("revisionRetention"))) ? String(form.get("revisionRetention")) : "all",
    defaultIndexing: form.get("defaultIndexing") === "noindex" ? "noindex" : "index",
    requirePublishPermission: form.get("requirePublishPermission") === "on",
    showDisabledModules: form.get("showDisabledModules") === "on",
  });
  const settings = parseCmsSettings(raw);
  const valueJson = JSON.stringify(settings);
  const id = randomUUID();

  try {
    await prisma.$executeRaw`
      INSERT INTO SiteContent (id, namespace, contentKey, valueJson, valueType, status, createdAt, updatedAt)
      VALUES (${id}, 'cms_settings', 'global', ${valueJson}, 'json', 'published', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE valueJson = VALUES(valueJson), status = 'published', updatedAt = CURRENT_TIMESTAMP(3)
    `;
  } catch {
    return NextResponse.redirect(new URL("/icerik/ayarlar?durum=hata", request.url), 303);
  }

  return NextResponse.redirect(new URL("/icerik/ayarlar?durum=kaydedildi", request.url), 303);
}
