import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("email verification issuance serializes cooldown and token replacement on live User state", () => {
  const state = source("src/features/auth/email-verification-state.ts");
  const issueStart = state.indexOf("export async function issueEmailVerification");
  const redeemStart = state.indexOf("export async function redeemEmailVerification");
  const issue = state.slice(issueStart, redeemStart);
  const userLock = issue.indexOf("FROM User");
  const eligibility = issue.indexOf("availableUser(user)");
  const tokenLock = issue.indexOf("FROM EmailVerificationToken");
  const tokenCreate = issue.indexOf("transaction.emailVerificationToken.create");

  assert.ok(userLock >= 0, "verification issuance must lock User");
  assert.ok(eligibility > userLock, "verification eligibility must run after User lock");
  assert.ok(tokenLock > eligibility, "verification token cooldown state must be read after User authorization");
  assert.ok(tokenCreate > tokenLock, "verification token must be created after locked cooldown evaluation");
  assertContains(issue, "FOR UPDATE", "verification issuance locks");
  assertContains(state, "const EMAIL_VERIFICATION_COOLDOWN_MS = 60 * 1000", "existing resend cooldown");
  assertContains(state, "const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000", "existing verification TTL");
  assertContains(state, 'user.status === "active"', "verification active-account guard");
  assertContains(state, "!Boolean(user.isBanned)", "verification banned-account guard");
  assertContains(state, "!user.deletedAt", "verification deleted-account guard");
});

test("email verification redemption locks User before token claim", () => {
  const state = source("src/features/auth/email-verification-state.ts");
  const redeemStart = state.indexOf("export async function redeemEmailVerification");
  const redeem = state.slice(redeemStart);
  const userLock = redeem.indexOf("FROM User");
  const eligibility = redeem.indexOf("availableUser(user)");
  const tokenLock = redeem.indexOf("FROM EmailVerificationToken");
  const tokenClaim = redeem.indexOf("transaction.emailVerificationToken.updateMany");
  const userUpdate = redeem.indexOf("transaction.user.update");

  assert.ok(userLock >= 0, "verification redemption must lock User");
  assert.ok(eligibility > userLock, "verification redemption must re-authorize live account after User lock");
  assert.ok(tokenLock > eligibility, "verification redemption must lock token after User authorization");
  assert.ok(tokenClaim > tokenLock, "verification token claim must happen after token lock");
  assert.ok(userUpdate > tokenClaim, "emailVerified mutation must happen only after one-time token claim");
  assertContains(redeem, 'source: "verification_link"', "verification audit source");
});

test("verification public surfaces cannot own parallel token storage writes", () => {
  const resend = source("src/features/profile/email-verification-actions.ts");
  const confirm = source("src/app/auth/confirm/route.ts");

  assertContains(resend, "issueEmailVerification({", "verification resend delegation");
  assertContains(resend, "revokeIssuedEmailVerification({", "verification failed-delivery cleanup delegation");
  assertContains(confirm, "redeemEmailVerification({", "verification route redemption delegation");

  for (const [label, surface] of [
    ["verification resend action", resend],
    ["verification confirm route", confirm],
  ]) {
    assert.ok(
      !surface.includes('from "@/lib/prisma"'),
      `${label} must not import Prisma directly`,
    );
    assert.ok(
      !surface.includes("emailVerificationToken.create"),
      `${label} must not create verification tokens directly`,
    );
    assert.ok(
      !surface.includes("emailVerificationToken.updateMany"),
      `${label} must not claim verification tokens directly`,
    );
    assert.ok(
      !surface.includes("emailVerificationToken.deleteMany"),
      `${label} must not mutate verification token storage directly`,
    );
  }
});
