import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const keyPattern = /^contact_[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const form = await request.formData();
  const key = String(form.get("key") ?? "").trim();
  if (!keyPattern.test(key)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.$executeRaw`
    UPDATE SiteContent
    SET status = 'archived', updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = 'form_submission' AND contentKey = ${key}
  `;

  return NextResponse.redirect(new URL("/icerik/formlar", request.url), 303);
}
