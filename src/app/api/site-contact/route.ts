import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const form = await request.formData();
  const name = clean(form.get("name"), 140);
  const email = clean(form.get("email"), 220);
  const subject = clean(form.get("subject"), 180);
  const message = clean(form.get("message"), 4000);

  if (!name || !email || !message || !email.includes("@")) {
    return NextResponse.redirect(new URL("/iletisim?durum=eksik", request.url), 303);
  }

  const id = randomUUID();
  const valueJson = JSON.stringify({ id, name, email, subject, message, state: "new" });

  try {
    await prisma.$executeRaw`
      INSERT INTO SiteContent (
        id, namespace, contentKey, valueJson, valueType, status,
        createdAt, updatedAt
      ) VALUES (
        ${id}, 'form_submission', ${`contact_${id}`}, ${valueJson}, 'json', 'published',
        CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
    `;
  } catch {
    return NextResponse.redirect(new URL("/iletisim?durum=hata", request.url), 303);
  }

  return NextResponse.redirect(new URL("/iletisim?durum=alindi", request.url), 303);
}
