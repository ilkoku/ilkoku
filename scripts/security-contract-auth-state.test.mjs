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
  assert.ok(
    text.includes(fragment),
    `${label} must contain ${JSON.stringify(fragment)}`,
  );
}

test("password reset issuance serializes on the live user and preserves account eligibility", () => {
  const state = source("src/features/auth/password-reset-state.ts");

  assertContains(state, "FROM User", "password reset issuance");
  assertContains(state, "FOR UPDATE", "password reset issuance");
  assertContains(state, 'user.status === "active"', "password reset account eligibility");
  assertContains(state, "!Boolean(user.isBanned)", "password reset banned-account guard");
  assertContains(state, "!user.deletedAt", "password reset deleted-account guard");
  assertContains(
    state,
    "transaction.passwordResetToken.deleteMany",
    "password reset token replacement",
  );
  assertContains(
    state,
    "transaction.passwordResetToken.create",
    "password reset token replacement",
  );
});

test("password reset redemption locks user before token and invalidates all other credentials", () => {
  const state = source("src/features/auth/password-reset-state.ts");
  const redeemStart = state.indexOf("export async function redeemPasswordReset");
  const redeem = state.slice(redeemStart);
  const userLock = redeem.indexOf("FROM User");
  const tokenLock = redeem.indexOf("FROM PasswordResetToken");

  assert.ok(userLock >= 0, "redemption must lock the live user");
  assert.ok(tokenLock > userLock, "redemption must lock User before PasswordResetToken");
  assertContains(redeem, "transaction.session.deleteMany", "password reset session revocation");
  assertContains(
    redeem,
    "transaction.passwordResetToken.deleteMany",
    "password reset sibling-token revocation",
  );
  assertContains(redeem, 'source: "password_reset"', "password reset audit source");
});

test("legacy auth server actions delegate password reset state to the canonical locked boundary", () => {
  const actions = source("src/features/auth/actions.ts");

  assertContains(actions, "issuePasswordReset({", "password reset request action");
  assertContains(actions, "redeemPasswordReset({", "password reset redemption action");
  assertContains(
    actions,
    "return success(notificationContent.passwordResetSent)",
    "password reset anti-enumeration response",
  );
  assert.ok(
    !actions.includes("prisma.$transaction([\n        prisma.passwordResetToken.deleteMany"),
    "legacy parallel reset-token transaction must stay removed",
  );
});
