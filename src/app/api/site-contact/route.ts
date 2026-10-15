import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSiteContactNotification } from "@/lib/email/site-contact-notification";
import { isSameOriginRequest, sameOriginRequestUrl } from "@/lib/same-origin";

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  // The request URL can reference the internal Node origin behind a proxy.
  // Match the browser's origin against our shared public/proxy-aware allowlist
  // instead; never trust an arbitrary Origin or Referer value.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const form = await request.formData();
  const name = clean(form.get("name"), 140);
  const email = clean(form.get("email"), 220);
  const subject = clean(form.get("subject"), 180);
  const message = clean(form.get("message"), 4000);

  if (!name || !email || !message || !email.includes("@")) {
    return NextResponse.redirect(sameOriginRequestUrl(request, "/iletisim?durum=eksik"), 303);
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
    return NextResponse.redirect(sameOriginRequestUrl(request, "/iletisim?durum=hata"), 303);
  }

  // Persist the submission first. A transient SMTP failure must not discard
  // the user's message or turn a genuine save into a failed form submission.
  try {
    await sendSiteContactNotification({ id, name, email, subject, message });
  } catch {
    // EmailDelivery records delivery errors. Never log user-entered PII here.
    console.error("SITE_CONTACT_NOTIFICATION_FAILED", { submissionId: id });
  }

  return NextResponse.redirect(sameOriginRequestUrl(request, "/iletisim?durum=alindi"), 303);
}
