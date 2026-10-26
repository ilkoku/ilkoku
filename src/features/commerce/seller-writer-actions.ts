"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const route = "/satis-erisim/satici-yetkileri";
const uuid = z.string().uuid();
const sellerSchema = z.object({
  kind: z.enum(["individual", "organization"]),
  legalName: z.string().trim().min(3).max(240),
  taxIdentifier: z.string().trim().min(5).max(32),
  taxOffice: z.string().trim().max(160),
  legalAddress: z.string().trim().min(12).max(5000),
  contactEmail: z.email().max(320),
  contactPhone: z.string().trim().max(32),
});
const rightsSchema = z.object({
  workId: uuid,
  legalPartyId: uuid,
  evidenceUrl: z.url().refine((url) => url.startsWith("https://")),
  documentEvidence: z.string().trim().min(80).max(20000),
  validUntil: z.string().trim().max(10),
});

async function writerIdentity() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=%2Fsatis-erisim%2Fsatici-yetkileri");
  if (user.role !== "writer" || user.status !== "active" || user.isBanned || user.deletedAt) {
    redirect("/erisim-reddedildi");
  }
  return user;
}
function finish(code: string): never {
  redirect(`${route}?durum=${encodeURIComponent(code)}`);
}
function validateEndDate(input: string) {
  if (!input) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return undefined;
  const [year, month, day] = input.split("-").map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  if (calendar.getUTCFullYear() !== year ||
      calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day) return undefined;
  const result = new Date(`${input}T23:59:59+03:00`);
  return Number.isNaN(result.getTime()) || result <= new Date() ? undefined : result;
}

/**
 * Author self-service: drafts ONLY. It never verifies a legal identity,
 * approves rights, or opens a paid/0 TL checkout.
 */
export async function submitWriterLegalSellerAction(data: FormData) {
  const writer = await writerIdentity();
  const values = sellerSchema.safeParse({
    kind: data.get("kind"),
    legalName: data.get("legalName"),
    taxIdentifier: data.get("taxIdentifier"),
    taxOffice: data.get("taxOffice") ?? "",
    legalAddress: data.get("legalAddress"),
    contactEmail: data.get("contactEmail"),
    contactPhone: data.get("contactPhone") ?? "",
  });
  if (!values.success) finish("kimlik-bilgisi-eksik");

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${writer.id} FOR UPDATE`;
    const count = await tx.legalParty.count({ where: { ownerUserId: writer.id } });
    if (count >= 5) return "kayit-siniri";
    const duplicate = await tx.legalParty.findFirst({
      where: {
        ownerUserId: writer.id,
        taxIdentifier: values.data.taxIdentifier,
        verificationStatus: { in: ["pending", "verified"] },
      },
      select: { id: true },
    });
    if (duplicate) return "zaten-basvuru-var";

    const party = await tx.legalParty.create({
      data: {
        ...values.data,
        taxOffice: values.data.taxOffice || null,
        contactPhone: values.data.contactPhone || null,
        ownerUserId: writer.id,
        verificationStatus: "pending",
        countryCode: "TR",
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: writer.id,
        action: "work_status_changed",
        entityType: "LegalParty",
        entityId: party.id,
        metadata: JSON.stringify({ source: "writer_seller_identity_submitted", state: "pending_admin_review" }),
      },
    });
    return "kimlik-gonderildi";
  });
  revalidatePath(route);
  revalidatePath("/sistem-yonetimi/odeme-sistemi/satici-yetkileri");
  finish(result);
}

/** An author can only submit evidence for their OWN published paid work
 * with a party owned by the same author. Review and authorization stay admin-only.
 */
export async function submitWriterSalesRightsAction(data: FormData) {
  const writer = await writerIdentity();
  const parsed = rightsSchema.safeParse({
    workId: data.get("workId"),
    legalPartyId: data.get("legalPartyId"),
    evidenceUrl: data.get("evidenceUrl"),
    documentEvidence: data.get("documentEvidence"),
    validUntil: String(data.get("validUntil") ?? ""),
  });
  if (!parsed.success) finish("yetki-bilgisi-eksik");
  const validUntil = validateEndDate(parsed.data.validUntil);
  if (validUntil === undefined) finish("yetki-gecerlilik-tarihi-hatali");

  const digest = createHash("sha256").update(parsed.data.documentEvidence, "utf8").digest("hex");
  const result = await prisma.$transaction(async (tx) => {
    const [work, party] = await Promise.all([
      tx.work.findFirst({
        where: {
          id: parsed.data.workId,
          authorId: writer.id,
          archivedAt: null,
          isActive: true,
          status: "published",
          saleConfiguration: { is: { saleModel: "paid", status: { in: ["ready", "active"] } } },
        },
        select: { id: true },
      }),
      tx.legalParty.findFirst({
        where: {
          id: parsed.data.legalPartyId,
          ownerUserId: writer.id,
          kind: { in: ["individual", "organization"] },
          verificationStatus: { in: ["pending", "verified"] },
        },
        select: { id: true },
      }),
    ]);
    if (!work || !party) return false;
    // Serialize concurrent submissions for the same author-owned work.
    await tx.$queryRaw`SELECT id FROM Work WHERE id = ${work.id} FOR UPDATE`;
    const last = await tx.workSalesAuthorization.findFirst({
      where: { workId: work.id, legalPartyId: party.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const authorization = await tx.workSalesAuthorization.create({
      data: {
        workId: work.id,
        legalPartyId: party.id,
        version: (last?.version ?? 0) + 1,
        status: "pending",
        rightsScope: { right: "digital_read_access", territory: "TR", evidenceUrl: parsed.data.evidenceUrl },
        documentHash: digest,
        validFrom: new Date(),
        validUntil,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: writer.id,
        action: "work_status_changed",
        entityType: "WorkSalesAuthorization",
        entityId: authorization.id,
        metadata: JSON.stringify({
          source: "writer_sales_rights_submitted",
          state: "pending_admin_review",
          workId: work.id,
          legalPartyId: party.id,
          documentHash: digest,
          evidenceUrl: parsed.data.evidenceUrl,
        }),
      },
    });
    return true;
  });
  if (!result) finish("yetki-dogrulanamadi");
  revalidatePath(route);
  revalidatePath("/sistem-yonetimi/odeme-sistemi/satici-yetkileri");
  finish("yetki-gonderildi");
}
