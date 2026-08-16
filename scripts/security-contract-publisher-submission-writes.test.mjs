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

test("legacy publisher submission writes re-authorize live actor and membership under locks", () => {
  const state = source("src/features/publisher-submissions/submission-write-state.ts");
  const authStart = state.indexOf("async function lockAuthorizedSubmission");
  const auth = state.slice(authStart, state.indexOf("export async function updatePublisherSubmissionDecisionLocked"));
  const userLock = auth.indexOf("FROM User");
  const publisherLock = auth.indexOf("FROM Publisher");
  const membershipLock = auth.indexOf("FROM PublisherMembership");
  const permissionCheck = auth.indexOf("hasPublisherPermission(");
  const submissionLock = auth.indexOf("FROM PublisherSubmission");

  assert.ok(userLock >= 0, "submission write authorization must lock User");
  assert.ok(publisherLock > userLock, "submission write authorization must lock Publisher after User");
  assert.ok(membershipLock > publisherLock, "submission write authorization must lock Membership after Publisher");
  assert.ok(permissionCheck > membershipLock, "permission must be checked only after Membership is locked");
  assert.ok(submissionLock > permissionCheck, "submission row must be locked after live authorization");
  assertContains(auth, "FOR UPDATE", "submission authorization row locks");
  assertContains(auth, 'actor.status !== "active"', "submission active-user guard");
  assertContains(auth, "Boolean(actor.isBanned)", "submission banned-user guard");
  assertContains(auth, "actor.deletedAt", "submission deleted-user guard");
  assertContains(auth, "!Boolean(publisher.active)", "submission active-publisher guard");
  assertContains(auth, "!Boolean(publisher.verified)", "submission verified-publisher guard");
  assertContains(auth, "publisher.archivedAt", "submission archived-publisher guard");
  assertContains(auth, "!Boolean(lockedMembership.active)", "submission active-membership guard");
});

test("decision and internal-note writes share the locked authorization boundary", () => {
  const state = source("src/features/publisher-submissions/submission-write-state.ts");
  const actions = source("src/features/publisher-submissions/actions.ts");

  assertContains(
    state,
    'permission: "decide_submission"',
    "decision permission reauthorization",
  );
  assertContains(
    state,
    'permission: "add_internal_note"',
    "internal-note permission reauthorization",
  );
  assertContains(
    actions,
    "updatePublisherSubmissionDecisionLocked({",
    "public decision action delegation",
  );
  assertContains(
    actions,
    "addPublisherInternalNoteLocked({",
    "public internal-note action delegation",
  );
  assert.ok(
    !actions.includes("updateLegacyPublisherSubmissionDecision"),
    "public decision action must not reconnect the pre-lock legacy helper",
  );
  assert.ok(
    !actions.includes("addLegacyPublisherInternalNote"),
    "public internal-note action must not reconnect the pre-lock legacy helper",
  );
});

test("terminal legacy submission decisions remain terminal", () => {
  const state = source("src/features/publisher-submissions/submission-write-state.ts");

  assertContains(
    state,
    'if (from === "accepted" || from === "rejected") return from === to;',
    "terminal submission transition guard",
  );
  assertContains(
    state,
    'if (from === "reviewing" && to === "pending") return false;',
    "reviewing-to-pending regression guard",
  );
});
