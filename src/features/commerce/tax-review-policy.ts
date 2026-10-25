/**
 * A staff-entered reference to an external examination, not government verification.
 * Status never authorizes ledger posts, legal documents or payouts.
 */
export const DOCUMENT_KINDS = [
  "commercial_invoice",
  "self_employed_receipt",
  "gvk18_expense_receipt",
] as const;
export const REVIEW_DECISIONS = [
  "verified",
  "needs_revision",
  "revoked",
] as const;

export type DocumentKind = typeof DOCUMENT_KINDS[number];
export type ReviewDecision = typeof REVIEW_DECISIONS[number];

export function validateAuthorTaxReview(input: {
  documentKind: string;
  decision: string;
  evidenceReference: string;
  validUntil: string;
  attested: boolean;
}, now: Date = new Date()) {
  const errors: string[] = [];
  if (!DOCUMENT_KINDS.some((v) => v === input.documentKind)) errors.push("Belge türü geçersiz.");
  if (!REVIEW_DECISIONS.some((v) => v === input.decision)) errors.push("Karar geçersiz.");
  const evidence = input.evidenceReference.trim().toUpperCase();
  if (evidence && !/^[A-Z0-9][A-Z0-9_-]{4,63}$/u.test(evidence)) {
    errors.push("Kanıt referansı 5-64 karakterlik harf, rakam, - veya _ olmalı.");
  }

  let validUntil: Date | null = null;
  if (input.decision === "verified") {
    if (!input.attested) errors.push("Haricî belge incelemesi onaylanmadı.");
    if (!evidence) errors.push("Onay için kişisel bilgi içermeyen kanıt referansı gerekli.");
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.validUntil)) {
      errors.push("Onay için geçerlilik bitiş tarihi gerekli.");
    } else {
      const candidate = new Date(input.validUntil + "T23:59:59.999Z");
      if (Number.isNaN(candidate.getTime()) ||
          candidate.toISOString().slice(0, 10) !== input.validUntil ||
          candidate <= now) {
        errors.push("Geçerlilik tarihi gelecekte ve takvimde geçerli olmalı.");
      } else {
        validUntil = candidate;
      }
    }
  } else if (input.validUntil) {
    errors.push("Yalnız onaylı incelemelerde geçerlilik tarihi kullanılabilir.");
  }

  return errors.length > 0
    ? { ok: false as const, errors }
    : {
        ok: true as const,
        documentKind: input.documentKind as DocumentKind,
        decision: input.decision as ReviewDecision,
        evidenceReference: evidence || null,
        validUntil,
      };
}

export function resolveLatestAuthorTaxReview(input: {
  documentKind: string;
  decision: string;
  reviewedAt: Date;
  validUntil: Date | null;
} | null, now: Date = new Date()) {
  if (!input) return { state: "missing" as const, documentKind: null };
  if (input.decision !== "verified") {
    return { state: input.decision === "revoked" ? "revoked" as const : "needs_revision" as const, documentKind: null };
  }
  if (!input.validUntil || input.validUntil <= now || input.reviewedAt > now) {
    return { state: "expired" as const, documentKind: null };
  }
  if (!DOCUMENT_KINDS.some((kind) => kind === input.documentKind)) {
    return { state: "invalid" as const, documentKind: null };
  }
  return { state: "verified" as const, documentKind: input.documentKind as DocumentKind };
}
