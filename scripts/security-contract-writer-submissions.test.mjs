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

test("writer submission creation locks live writer before work and publisher", () => {
  const state = source("src/features/publisher-submissions/writer-submission-state.ts");
  const start = state.indexOf("export async function createPublisherSubmissionLocked");
  const end = state.indexOf("export async function withdrawPublisherSubmissionLocked");
  const create = state.slice(start, end);
  const writerLockCall = create.indexOf("lockActiveWriter(transaction, input.authorId)");
  const workLock = create.indexOf("FROM Work");
  const publisherLock = create.indexOf("FROM Publisher");
  const duplicateCheck = create.indexOf("transaction.publisherSubmission.findFirst");
  const submissionCreate = create.indexOf("transaction.publisherSubmission.create");

  assert.ok(writerLockCall >= 0, "submission creation must lock live writer");
  assert.ok(workLock > writerLockCall, "submission creation must lock Work after writer");
  assert.ok(publisherLock > workLock, "submission creation must lock Publisher after Work");
  assert.ok(duplicateCheck > publisherLock, "duplicate check must run inside serialized work/publisher state");
  assert.ok(submissionCreate > duplicateCheck, "submission create must follow duplicate check");
  assertContains(state, "FROM User", "writer lifecycle lock");
  assertContains(state, 'writer.role !== "writer"', "writer role guard");
  assertContains(state, 'writer.status !== "active"', "writer active-account guard");
  assertContains(state, "Boolean(writer.isBanned)", "writer banned-account guard");
  assertContains(state, "writer.deletedAt", "writer deleted-account guard");
  assertContains(create, "acceptsSubmissions = 1", "publisher submissions-open guard");
});

test("writer submission withdrawal locks live writer before submission state", () => {
  const state = source("src/features/publisher-submissions/writer-submission-state.ts");
  const start = state.indexOf("export async function withdrawPublisherSubmissionLocked");
  const withdraw = state.slice(start);
  const writerLockCall = withdraw.indexOf("lockActiveWriter(transaction, authorId)");
  const submissionLock = withdraw.indexOf("FROM PublisherSubmission");
  const mutation = withdraw.indexOf("transaction.publisherSubmission.update");

  assert.ok(writerLockCall >= 0, "submission withdrawal must lock live writer");
  assert.ok(submissionLock > writerLockCall, "submission withdrawal must lock submission after writer");
  assert.ok(mutation > submissionLock, "withdrawal mutation must follow locked state validation");
  assertContains(withdraw, 'submission.status !== "pending"', "withdraw pending-state guard");
  assertContains(withdraw, 'submission.status !== "reviewing"', "withdraw reviewing-state guard");
});

test("writer submission public mutation layer cannot reconnect legacy lifecycle helpers", () => {
  const mutations = source("src/features/publishers/mutations.ts");

  assertContains(mutations, "createPublisherSubmissionLocked", "writer submission create delegation");
  assertContains(mutations, "withdrawPublisherSubmissionLocked", "writer submission withdraw delegation");
  assert.ok(
    !mutations.includes("createLegacyPublisherSubmission"),
    "writer mutation layer must not reconnect legacy create helper",
  );
  assert.ok(
    !mutations.includes("withdrawLegacyPublisherSubmission"),
    "writer mutation layer must not reconnect legacy withdraw helper",
  );
});

test("legacy submission notifications exclude banned publisher users", () => {
  const state = source("src/features/publisher-submissions/writer-submission-state.ts");
  assertContains(state, "isBanned: false", "legacy submission notification recipient scope");
});
