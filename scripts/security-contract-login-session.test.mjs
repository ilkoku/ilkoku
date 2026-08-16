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

test("login session issuance serializes on live user state", () => {
  const state = source("src/lib/auth/login-session-state.ts");
  const login = source("src/lib/auth/login.ts");
  const issueStart = state.indexOf("export async function issueLoginSession");
  const issue = state.slice(issueStart);
  const userLock = issue.indexOf("FROM User");
  const liveEligibilityCall = issue.indexOf("availableUser(user)");
  const changedHashCheck = issue.indexOf("user.passwordHash !== input.preverifiedPasswordHash");
  const sessionCreate = issue.indexOf("transaction.session.create");

  assert.ok(userLock >= 0, "login session issuance must lock User");
  assert.ok(
    liveEligibilityCall > userLock,
    "login eligibility must be checked after the User lock",
  );
  assert.ok(
    changedHashCheck > liveEligibilityCall,
    "live password hash must be compared after account eligibility",
  );
  assert.ok(sessionCreate > changedHashCheck, "Session must be created only after live credential checks");
  assertContains(issue, "FOR UPDATE", "login User lock");
  assertContains(state, 'user.status === "active"', "login active-account guard");
  assertContains(state, "!Boolean(user.isBanned)", "login banned-account guard");
  assertContains(state, "!user.deletedAt", "login deleted-account guard");
  assertContains(issue, "verifyPassword(input.password, user.passwordHash)", "changed live password recheck");

  assertContains(login, "issueLoginSession({", "login canonical session delegation");
  assert.ok(
    !login.includes("await prisma.session.create"),
    "login.ts must not create sessions outside the locked state boundary",
  );
});
