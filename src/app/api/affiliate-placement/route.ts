import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  AFFILIATE_PLACEMENT_NAMESPACE,
  HOMEPAGE_AFTER_ROLES_PLACEMENT,
} from "@/lib/affiliate-placement";
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
  const placement = String(form.get("placement") ?? "");
  if (placement !== HOMEPAGE_AFTER_ROLES_PLACEMENT) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const enabledValue = String(form.get("enabled") ?? "");
  if (enabledValue !== "active" && enabledValue !== "passive") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const valueJson = JSON.stringify({ enabled: enabledValue === "active" });
  const id = randomUUID();

  try {
    await prisma.$executeRaw`
      INSERT INTO SiteContent (id, namespace, contentKey, valueJson, valueType, status, createdAt, updatedAt)
      VALUES (
        ${id},
        ${AFFILIATE_PLACEMENT_NAMESPACE},
        ${HOMEPAGE_AFTER_ROLES_PLACEMENT},
        ${valueJson},
        'json',
        'published',
        CURRENT_TIMESTAMP(3),
        CURRENT_TIMESTAMP(3)
      )
      ON DUPLICATE KEY UPDATE
        valueJson = VALUES(valueJson),
        status = 'published',
        updatedAt = CURRENT_TIMESTAMP(3)
    `;
  } catch {
    return NextResponse.redirect(new URL("/icerik/banner-reklam-alanlari?durum=hata", request.url), 303);
  }

  revalidatePath("/");
  revalidatePath("/icerik/banner-reklam-alanlari");

  return NextResponse.redirect(new URL("/icerik/banner-reklam-alanlari?durum=kaydedildi", request.url), 303);
}
