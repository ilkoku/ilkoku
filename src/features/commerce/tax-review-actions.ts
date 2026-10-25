"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { validateAuthorTaxReview } from "./tax-review-policy";

const PAGE = "/sistem-yonetimi/finans-gelirler/yazar-vergi-inceleme";

export async function recordAuthorTaxReviewAction(formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/giris?sonraki=" + encodeURIComponent(PAGE));
  if (actor.role !== "admin") redirect("/erisim-reddedildi?kaynak=system_management");

  const authorId = String(formData.get("authorId") ?? "");
  if (!/^[a-fA-F0-9-]{36}$/u.test(authorId)) redirect(PAGE + "?durum=gecersiz-yazar");
  const author = await prisma.user.findFirst({
    where: { id: authorId, role: "writer", status: "active", deletedAt: null },
    select: { id: true, publicId: true },
  });
  if (!author) redirect(PAGE + "?durum=gecersiz-yazar");

  const checked = validateAuthorTaxReview({
    documentKind: String(formData.get("documentKind") ?? ""),
    decision: String(formData.get("decision") ?? ""),
    evidenceReference: String(formData.get("evidenceReference") ?? ""),
    validUntil: String(formData.get("validUntil") ?? ""),
    attested: formData.get("attested") === "yes",
  });
  const next = PAGE + "?yazar=" + encodeURIComponent(author.publicId);
  if (!checked.ok) redirect(next + "&durum=gecersiz-inceleme");

  // Append-only review event. Invoices, taxpayer identifiers, bank details
  // and document images are NOT accepted and NO payout state is changed.
  await prisma.authorTaxReviewEvent.create({
    data: {
      authorId: author.id,
      reviewerId: actor.id,
      decision: checked.decision,
      documentKind: checked.documentKind,
      evidenceReference: checked.evidenceReference,
      validUntil: checked.validUntil,
    },
  });
  revalidatePath(PAGE);
  revalidatePath("/sistem-yonetimi/finans-gelirler/siparis-mali-inceleme");
  redirect(next + "&durum=kaydedildi");
}
