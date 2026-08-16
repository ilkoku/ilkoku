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

test("legacy submission creation locks live author before work and publisher", () => {
  const state = source("src/features/publisher-submissions/legacy-lifecycle-state.ts");
  const start = state.indexOf("export async function createLegacyPublisherSubmission");
  const end = state.indexOf("export async function withdrawLegacyPublisherSubmission");
  const create = state.slice(start, end);
  const userLock = create.indexOf("lockLiveUser(transaction, input.authorId)");
  const workLock = create.indexOf("FROM Work");
  const publisherLock = create.indexOf("lockLivePublisher(");
  const duplicateCheck = create.indexOf("publisherSubmission.findFirst");

  assert.ok(userLock >= 0, "creation must lock the live author");
  assert.ok(workLock > userLock, "creation must lock Work after live author");
  assert.ok(publisherLock > workLock, "creation must lock Publisher after Work");
  assert.ok(duplicateCheck > publisherLock, "duplicate check must run after serialization locks");
  assertContains(create, 'author.role !== "writer"', "creation writer-role guard");
  assertContains(create, "FOR UPDATE", "creation Work lock");
  assertContains(create, "acceptsSubmissions: true", "creation accepting-publisher guard");
});

test("legacy submission withdrawal locks live author before submission state", () => {
  const state = source("src/features/publisher-submissions/legacy-lifecycle-state.ts");
  const start = state.indexOf("export async function withdrawLegacyPublisherSubmission");
  const end = state.indexOf("export async function getLegacyPublisherFiles");
  const withdraw = state.slice(start, end);
  const userLock = withdraw.indexOf("lockLiveUser(transaction, authorId)");
  const submissionLock = withdraw.indexOf("FROM PublisherSubmission");

  assert.ok(userLock >= 0, "withdrawal must lock the live author");
  assert.ok(submissionLock > userLock, "withdrawal must lock Submission after live author");
  assertContains(withdraw, "FOR UPDATE", "withdrawal submission lock");
  assertContains(withdraw, 'submission.status !== "pending"', "withdrawal pending-state guard");
  assertContains(withdraw, 'submission.status !== "reviewing"', "withdrawal reviewing-state guard");
  assertContains(withdraw, 'status: "withdrawn"', "withdrawal terminal state");
});

test("legacy publisher file reads re-authorize live account publisher and membership", () => {
  const state = source("src/features/publisher-submissions/legacy-lifecycle-state.ts");
  const authStart = state.indexOf("async function authorizePublisherRead");
  const authEnd = state.indexOf("async function getSubmissionNotificationRecipients");
  const auth = state.slice(authStart, authEnd);
  const userLock = auth.indexOf("lockLiveUser(transaction, input.userId)");
  const publisherLock = auth.indexOf("lockLivePublisher(");
  const membershipLock = auth.indexOf("lockLiveMembership(");

  assert.ok(userLock >= 0, "file read must lock live User");
  assert.ok(publisherLock > userLock, "file read must lock Publisher after User");
  assert.ok(membershipLock > publisherLock, "normal file read must lock Membership after Publisher");
  assertContains(auth, "input.snapshot.adminReadOnly", "admin-preview read branch");
  assertContains(auth, "user.role !== \"admin\"", "admin-preview live-role guard");

  const downloadStart = state.indexOf("export async function getLegacyPublisherFileForDownload");
  const download = state.slice(downloadStart);
  const permission = download.indexOf('permission: "download_files"');
  const fileLock = download.indexOf("FROM PublisherFile");
  const submissionLock = download.indexOf("FROM PublisherSubmission");

  assert.ok(permission >= 0, "download must re-authorize download_files");
  assert.ok(fileLock > permission, "download must lock file after live authorization");
  assert.ok(submissionLock > fileLock, "download must lock owning submission after file");
  assertContains(download, "FOR UPDATE", "download file/submission locks");
  assertContains(download, "isPublisherAdminReadOnlyMembership(membership)", "admin-preview download denial");
});

test("legacy security facade cannot retain a second mutable submission implementation", () => {
  const facade = source("src/features/publisher-submissions/legacy-security.ts");

  assertContains(facade, 'from "./legacy-lifecycle-state"', "legacy lifecycle delegation");
  assertContains(facade, 'from "./submission-write-state"', "legacy decision delegation");
  assert.ok(!facade.includes("prisma.$transaction"), "compatibility facade must not mutate the database");
  assert.ok(!facade.includes("FROM PublisherSubmission"), "compatibility facade must not own row-lock logic");
});
