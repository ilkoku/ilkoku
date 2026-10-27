"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const basePath = "/sistem-yonetimi/odeme-sistemi/satici-yetkileri";
const uuid = z.string().uuid();
const kind = z.enum(["platform", "individual", "organization"]);
const partySchema = z.object({
  kind,
  ownerAuthorId: z.string().trim().optional(),
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
  evidenceUrl: z.url().refine((value) => value.startsWith("https://")),
  documentEvidence: z.string().trim().min(80).max(20000),
  validUntil: z.string().trim().max(10),
});

function go(status: string): never {
  redirect(`${basePath}?durum=${encodeURIComponent(status)}`);
}

async function adminIdentity() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=system_management");
  }
  return user;
}

function audit(actorId: string, source: string, entityType: string, entityId: string, extras: Record<string, string | null>) {
  return {
    actorId,
    action: "work_status_changed" as const,
    entityType,
    entityId,
    metadata: JSON.stringify({ source, ...extras }),
  };
}

export async function registerLegalSellerDraftAction(data: FormData) {
  const admin = await adminIdentity();
  const parsed = partySchema.safeParse({
    kind: data.get("kind"),
    ownerAuthorId: data.get("ownerAuthorId") ?? "",
    legalName: data.get("legalName"),
    taxIdentifier: data.get("taxIdentifier"),
    taxOffice: data.get("taxOffice") ?? "",
    legalAddress: data.get("legalAddress"),
    contactEmail: data.get("contactEmail"),
    contactPhone: data.get("contactPhone") ?? "",
  });
  if (!parsed.success) go("kimlik-bilgisi-eksik");

  // Author-owned sellers must be linked to an actual writer account.
  // Account linkage never verifies a legal identity or sales rights.
  const authorId = parsed.data.kind === "platform" ? null
    : uuid.safeParse(parsed.data.ownerAuthorId ?? "");
  if (parsed.data.kind !== "platform" && (!authorId || !authorId.success)) {
    go("satici-yazar-hesabi-eksik");
  }
  const ownerUserId = authorId && authorId.success ? authorId.data : null;
  if (ownerUserId) {
    const author = await prisma.user.findFirst({
      where: { id: ownerUserId, role: "writer", status: "active", isBanned: false, deletedAt: null },
      select: { id: true },
    });
    if (!author) go("satici-yazar-hesabi-eksik");
  }

  await prisma.$transaction(async (tx) => {
    const party = await tx.legalParty.create({
      data: {
        kind: parsed.data.kind,
        ownerUserId,
        legalName: parsed.data.legalName,
        taxIdentifier: parsed.data.taxIdentifier,
        legalAddress: parsed.data.legalAddress,
        contactEmail: parsed.data.contactEmail,
        taxOffice: parsed.data.taxOffice || null,
        contactPhone: parsed.data.contactPhone || null,
        verificationStatus: "pending",
        countryCode: "TR",
      },
    });
    await tx.auditLog.create({
      data: audit(admin.id, "commerce_seller_draft_created", "LegalParty", party.id, {
        kind: party.kind,
        ownerUserId: party.ownerUserId,
        evidenceState: "not_verified",
      }),
    });
  });
  revalidatePath(basePath);
  go("satici-taslagi-olusturuldu");
}

export async function verifyLegalSellerAction(data: FormData) {
  const admin = await adminIdentity();
  const id = uuid.safeParse(String(data.get("legalPartyId") ?? ""));
  const evidence = z.url().safeParse(String(data.get("evidenceUrl") ?? ""));
  const note = z.string().trim().min(25).max(1000).safeParse(String(data.get("reviewNote") ?? ""));
  if (
    !id.success || !evidence.success || !evidence.data.startsWith("https://") ||
    !note.success || data.get("reviewedOriginalEvidence") !== "on"
  ) go("kimlik-kaniti-gerekli");

  const updated = await prisma.$transaction(async (tx) => {
    const party = await tx.legalParty.findUnique({ where: { id: id.data } });
    if (
      !party || party.verificationStatus !== "pending" ||
      !party.legalName?.trim() || !party.taxIdentifier?.trim() ||
      !party.legalAddress?.trim() || !party.contactEmail?.trim()
    ) return false;
    await tx.legalParty.update({
      where: { id: party.id },
      data: { verificationStatus: "verified", verifiedAt: new Date(), verifiedById: admin.id },
    });
    await tx.auditLog.create({
      data: audit(admin.id, "commerce_seller_identity_verified", "LegalParty", party.id, {
        evidenceUrl: evidence.data,
        reviewNote: note.data,
      }),
    });
    return true;
  });
  if (!updated) go("kimlik-dogrulanamadi");
  revalidatePath(basePath);
  go("kimlik-dogrulandi");
}

export async function registerWorkSalesRightsDraftAction(data: FormData) {
  const admin = await adminIdentity();
  const parsed = rightsSchema.safeParse({
    workId: data.get("workId"),
    legalPartyId: data.get("legalPartyId"),
    evidenceUrl: data.get("evidenceUrl"),
    documentEvidence: data.get("documentEvidence"),
    validUntil: String(data.get("validUntil") ?? ""),
  });
  if (!parsed.success) go("yetki-bilgisi-eksik");

  const rawValidUntil = parsed.data.validUntil;
  // An invalid calendar date must not roll over into another month and
  // silently extend the approved sales authorization (e.g. 31 February).
  if (rawValidUntil && !/^\d{4}-\d{2}-\d{2}$/.test(rawValidUntil)) {
    go("yetki-gecerlilik-tarihi-hatali");
  }
  if (rawValidUntil) {
    const [year, month, day] = rawValidUntil.split("-").map(Number);
    const calendarDate = new Date(0);
    calendarDate.setUTCFullYear(year, month - 1, day);
    if (
      calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() + 1 !== month ||
      calendarDate.getUTCDate() !== day
    ) {
      go("yetki-gecerlilik-tarihi-hatali");
    }
  }
  const validUntil = rawValidUntil
    ? new Date(`${rawValidUntil}T23:59:59+03:00`)
    : null;
  if (validUntil && (Number.isNaN(validUntil.getTime()) || validUntil <= new Date())) {
    go("yetki-gecerlilik-tarihi-hatali");
  }

  const digest = createHash("sha256").update(parsed.data.documentEvidence, "utf8").digest("hex");
  const result = await prisma.$transaction(async (tx) => {
    const [party, work] = await Promise.all([
      tx.legalParty.findUnique({ where: { id: parsed.data.legalPartyId } }),
      tx.work.findFirst({
        where: {
          id: parsed.data.workId, archivedAt: null, status: "published",
          saleConfiguration: { is: { saleModel: "paid", status: { in: ["ready", "active"] } } },
        },
        select: { id: true, authorId: true },
      }),
    ]);
    if (
      !work || party?.verificationStatus !== "verified" ||
      (party.kind !== "platform" && party.ownerUserId !== work.authorId)
    ) return false;
    const latest = await tx.workSalesAuthorization.findFirst({
      where: { workId: work.id, legalPartyId: party.id },
      orderBy: { version: "desc" }, select: { version: true },
    });
    const rights = await tx.workSalesAuthorization.create({
      data: {
        workId: work.id,
        legalPartyId: party.id,
        version: (latest?.version ?? 0) + 1,
        status: "pending",
        rightsScope: {
          right: "digital_read_access",
          territory: "TR",
          evidenceUrl: parsed.data.evidenceUrl,
        },
        documentHash: digest,
        validFrom: new Date(),
        validUntil,
      },
    });
    await tx.auditLog.create({
      data: audit(admin.id, "commerce_sales_rights_draft_created", "WorkSalesAuthorization", rights.id, {
        workId: work.id, legalPartyId: party.id, evidenceUrl: parsed.data.evidenceUrl,
        documentHash: digest,
      }),
    });
    return true;
  });
  if (!result) go("yetki-dogrulanamadi");
  revalidatePath(basePath);
  go("yetki-taslagi-olusturuldu");
}

export async function approveWorkSellerRightsAction(data: FormData) {
  const admin = await adminIdentity();
  const id = uuid.safeParse(String(data.get("authorizationId") ?? ""));
  const note = z.string().trim().min(25).max(1000).safeParse(String(data.get("reviewNote") ?? ""));
  if (!id.success || !note.success || data.get("reviewedSalesRightsEvidence") !== "on") {
    go("yetki-onayi-eksik");
  }
  const approved = await prisma.$transaction(async (tx) => {
    const rights = await tx.workSalesAuthorization.findUnique({
      where: { id: id.data }, include: { legalParty: true, work: { include: { saleConfiguration: true } } },
    });
    if (
      !rights || rights.status !== "pending" || rights.revokedAt ||
      !rights.documentHash || !/^[a-f0-9]{64}$/i.test(rights.documentHash) ||
      !rights.rightsScope || (rights.validUntil && rights.validUntil <= new Date()) ||
      rights.legalParty.verificationStatus !== "verified" ||
      (rights.legalParty.kind !== "platform" &&
        rights.legalParty.ownerUserId !== rights.work.authorId) ||
      !rights.legalParty.verifiedAt || !rights.legalParty.verifiedById ||
      !rights.work.isActive || rights.work.archivedAt ||
      rights.work.status !== "published" ||
      rights.work.saleConfiguration?.saleModel !== "paid" ||
      !["ready", "active"].includes(rights.work.saleConfiguration.status)
    ) return false;

    const now = new Date();
    // Revoke only the work's previous current assignment. Historic orders keep
    // their immutable OrderLegalSnapshot and cannot be rewritten.
    await tx.workSellerAssignment.updateMany({
      where: { workId: rights.workId, currentKey: rights.workId },
      data: { currentKey: null, status: "revoked", revokedAt: now },
    });
    await tx.workSalesAuthorization.update({
      where: { id: rights.id },
      data: { status: "verified", verifiedById: admin.id, verifiedAt: now },
    });
    const newest = await tx.workSellerAssignment.findFirst({
      where: { workId: rights.workId }, orderBy: { version: "desc" },
      select: { version: true },
    });
    const assignment = await tx.workSellerAssignment.create({
      data: {
        workId: rights.workId,
        legalPartyId: rights.legalPartyId,
        authorizationId: rights.id,
        version: (newest?.version ?? 0) + 1,
        currentKey: rights.workId,
        mode: rights.legalParty.kind === "platform" ? "platform_direct" : "third_party",
        status: "approved",
        approvedById: admin.id,
        approvedAt: now,
      },
    });
    await tx.auditLog.create({
      data: audit(admin.id, "commerce_sales_authorization_approved", "WorkSellerAssignment", assignment.id, {
        workId: rights.workId,
        legalPartyId: rights.legalPartyId,
        authorizationId: rights.id,
        reviewNote: note.data,
        documentHash: rights.documentHash,
      }),
    });
    return true;
  });
  if (!approved) go("yetki-onaylanamadi");
  revalidatePath(basePath);
  revalidatePath("/sistem-yonetimi/odeme-sistemi/ayarlar");
  go("satis-yetkisi-onaylandi");
}

export async function revokeWorkSellerAssignmentAction(data: FormData) {
  const admin = await adminIdentity();
  const id = uuid.safeParse(String(data.get("assignmentId") ?? ""));
  const note = z.string().trim().min(25).max(1000).safeParse(String(data.get("revokeReason") ?? ""));
  if (!id.success || !note.success || data.get("confirmRevocation") !== "on") {
    go("iptal-aciklamasi-gerekli");
  }
  const updated = await prisma.$transaction(async (tx) => {
    const assignment = await tx.workSellerAssignment.findUnique({ where: { id: id.data } });
    if (!assignment || assignment.status !== "approved" || !assignment.currentKey) return false;
    await tx.workSellerAssignment.update({
      where: { id: assignment.id },
      data: { status: "revoked", currentKey: null, revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: audit(admin.id, "commerce_seller_assignment_revoked", "WorkSellerAssignment", assignment.id, {
        workId: assignment.workId, reason: note.data,
      }),
    });
    return true;
  });
  if (!updated) go("yetki-iptal-edilemedi");
  revalidatePath(basePath);
  revalidatePath("/sistem-yonetimi/odeme-sistemi/ayarlar");
  go("satis-yetkisi-iptal-edildi");
}
