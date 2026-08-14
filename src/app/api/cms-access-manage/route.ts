import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsAccess } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/same-origin";

type UserRow = { id: string; role: string };

function back(request: Request, durum: string) {
  return NextResponse.redirect(new URL(`/icerik/erisim?durum=${durum}`, request.url), 303);
}

export async function POST(request: Request) {
  const access = await getCmsAccess();
  if (!access.user || !access.isAdmin || !isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const form = await request.formData();
  const action = String(form.get("action") ?? "save");
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 320);
  if (!email || !email.includes("@")) return back(request, "gecersiz");

  const users = await prisma.$queryRaw<UserRow[]>`
    SELECT id, role
    FROM User
    WHERE email = ${email}
      AND status = 'active'
      AND isBanned = false
      AND deletedAt IS NULL
    LIMIT 1
  `;
  const target = users[0];
  if (!target) return back(request, "kullanici-yok");
  if (target.role === "admin") return back(request, "admin");

  if (action === "revoke") {
    await prisma.$executeRaw`
      UPDATE ContentManagerAccess
      SET active = false,
          canPublish = false,
          revokedAt = CURRENT_TIMESTAMP(3),
          updatedAt = CURRENT_TIMESTAMP(3)
      WHERE userId = ${target.id}
    `;
    return back(request, "iptal");
  }

  const canPublish = form.get("canPublish") === "on";
  await prisma.$executeRaw`
    INSERT INTO ContentManagerAccess (
      id, userId, active, canPublish, grantedById,
      grantedAt, revokedAt, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${target.id}, true, ${canPublish}, ${access.user.id},
      CURRENT_TIMESTAMP(3), NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      active = true,
      canPublish = VALUES(canPublish),
      grantedById = VALUES(grantedById),
      grantedAt = CURRENT_TIMESTAMP(3),
      revokedAt = NULL,
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  return back(request, "kaydedildi");
}
