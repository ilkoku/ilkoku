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
  assertContains(redeem, "otherSessionsClosed: true", "password reset session audit metadata");
  assertContains(redeem, "changedAt,", "password reset canonical redemption result");
  assertContains(redeem, "email: user.email", "password reset canonical account result");
  assertContains(redeem, "fullName: user.fullName", "password reset canonical account result");
});

test("all public password reset server-action surfaces delegate writes to the canonical locked boundary", () => {
  const actions = source("src/features/auth/actions.ts");
  const compatibilityActions = source("src/features/auth/password-security-actions.ts");

  for (const [label, actionSource] of [
    ["primary auth actions", actions],
    ["password compatibility actions", compatibilityActions],
  ]) {
    assertContains(actionSource, "issuePasswordReset({", `${label} reset issuance`);
    assertContains(actionSource, "redeemPasswordReset({", `${label} reset redemption`);
  }

  assertContains(
    actions,
    "return success(notificationContent.passwordResetSent)",
    "primary password reset anti-enumeration response",
  );
  assertContains(
    compatibilityActions,
    "notificationContent.passwordResetSent",
    "compatibility password reset anti-enumeration response",
  );
  assertContains(
    compatibilityActions,
    "sendPasswordChangedEmail({",
    "compatibility password changed security notice",
  );

  assert.ok(
    !compatibilityActions.includes('from "@/lib/prisma"'),
    "password compatibility actions must not import Prisma directly",
  );
  assert.ok(
    !compatibilityActions.includes("prisma.passwordResetToken"),
    "password compatibility actions must not access reset-token storage directly",
  );
  assert.ok(
    !compatibilityActions.includes("prisma.$transaction"),
    "password compatibility actions must not own a parallel credential transaction",
  );
  assert.ok(
    !compatibilityActions.includes("transaction.passwordResetToken"),
    "password compatibility actions must not mutate reset-token storage directly",
  );
  assert.ok(
    !actions.includes("prisma.$transaction([\n        prisma.passwordResetToken.deleteMany"),
    "legacy parallel reset-token transaction must stay removed from primary actions",
  );
});

test("profile password changes serialize on live account and current session state", () => {
  const state = source("src/features/profile/password-change-state.ts");
  const action = source("src/features/profile/password-security-actions.ts");
  const legacyActions = source("src/features/profile/actions.ts");
  const legacyPasswordStart = legacyActions.indexOf("export async function changePasswordAction");
  const legacyPassword = legacyActions.slice(legacyPasswordStart);
  const userLock = state.indexOf("FROM User");
  const sessionLock = state.indexOf("FROM Session");
  const passwordVerification = state.indexOf("verifyPassword(input.currentPassword, user.passwordHash)");

  assert.ok(userLock >= 0, "profile password change must lock User");
  assert.ok(sessionLock > userLock, "profile password change must lock User before Session");
  assert.ok(
    passwordVerification > sessionLock,
    "current password must be verified only after live User and Session state are locked",
  );
  assertContains(state, 'user.status === "active"', "profile password account eligibility");
  assertContains(state, "!Boolean(user.isBanned)", "profile password banned-account guard");
  assertContains(state, "!user.deletedAt", "profile password deleted-account guard");
  assertContains(state, "transaction.passwordResetToken.deleteMany", "profile password reset-token revocation");
  assertContains(state, "transaction.session.deleteMany", "profile password other-session revocation");
  assertContains(state, 'source: "profile"', "profile password audit source");

  assertContains(action, "changeProfilePassword({", "profile password action delegation");
  assert.ok(
    !action.includes('from "@/lib/prisma"'),
    "profile password action must not own credential database writes",
  );
  assert.ok(
    !action.includes("verifyPassword("),
    "profile password action must not verify a stale password outside the locked state boundary",
  );

  assert.ok(legacyPasswordStart >= 0, "legacy profile password action must remain discoverable for compatibility");
  assertContains(legacyPassword, "changeProfilePassword({", "legacy profile password action delegation");
  assert.ok(
    !legacyPassword.includes("verifyPassword("),
    "legacy profile password action must not verify a stale password outside the locked state boundary",
  );
  assert.ok(
    !legacyPassword.includes("prisma.user.findUnique"),
    "legacy profile password action must not read credential state outside the locked boundary",
  );
  assert.ok(
    !legacyPassword.includes("transaction.user.update"),
    "legacy profile password action must not own a parallel password write transaction",
  );
});

test("role selection UI is limited to the same self-service role sources as the write boundary", () => {
  const page = source("src/app/rol-secimi/page.tsx");
  const actions = source("src/features/auth/actions.ts");

  assertContains(
    page,
    'const selfServiceRoles: UserRole[] = ["reader", "writer", "editor_pending"]',
    "role selection page self-service source roles",
  );
  assertContains(
    actions,
    'const selfServiceRoleSources: UserRole[] = ["reader", "writer", "editor_pending"]',
    "role selection write boundary source roles",
  );
  assertContains(
    page,
    "!selfServiceRoles.includes(profile.actualRole)",
    "special-role role-selection redirect gate",
  );
  assertContains(
    page,
    "role: profile.actualRole",
    "special-role canonical navigation",
  );
  assertContains(
    page,
    "redirect(actualNavigation.workspaceHref)",
    "special-role canonical redirect",
  );
});
