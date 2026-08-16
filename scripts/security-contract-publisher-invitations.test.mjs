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

test("publisher invitation acceptance locks live account, publisher and invitation before membership activation", () => {
  const state = source("src/features/publisher-workspace/invitation-acceptance-state.ts");
  const start = state.indexOf("export async function acceptPublisherInvitationLocked");
  const accept = state.slice(start);
  const userLock = accept.indexOf("FROM User");
  const publisherLock = accept.indexOf("FROM Publisher");
  const invitationLock = accept.indexOf("FROM PublisherInvitation");
  const claim = accept.indexOf("transaction.publisherInvitation.updateMany");
  const membership = accept.indexOf("transaction.publisherMembership.upsert");

  assert.ok(userLock >= 0, "publisher invitation acceptance must lock User");
  assert.ok(publisherLock > userLock, "publisher invitation acceptance must lock Publisher after User");
  assert.ok(invitationLock > publisherLock, "publisher invitation acceptance must lock Invitation after Publisher");
  assert.ok(claim > invitationLock, "publisher invitation must be claimed after all live state locks");
  assert.ok(membership > claim, "membership activation must happen only after one-time invitation claim");
  assertContains(accept, "FOR UPDATE", "publisher invitation lifecycle locks");
  assertContains(accept, 'user.status !== "active"', "publisher invitation active-user guard");
  assertContains(accept, "Boolean(user.isBanned)", "publisher invitation banned-user guard");
  assertContains(accept, "user.deletedAt", "publisher invitation deleted-user guard");
  assertContains(accept, "!Boolean(publisher.active)", "publisher invitation active-publisher guard");
  assertContains(accept, "!Boolean(publisher.verified)", "publisher invitation verified-publisher guard");
  assertContains(accept, "publisher.archivedAt", "publisher invitation archived-publisher guard");
  assertContains(accept, 'status: "pending"', "publisher invitation one-time pending claim");
});

test("public publisher invitation action delegates acceptance to the locked lifecycle boundary", () => {
  const actions = source("src/features/publisher-workspace/actions.ts");

  assertContains(
    actions,
    'import { acceptPublisherInvitationLocked } from "./invitation-acceptance-state"',
    "publisher invitation locked-state import",
  );
  assertContains(
    actions,
    "const result = await acceptPublisherInvitationLocked({",
    "publisher invitation acceptance delegation",
  );
  assert.ok(
    !actions.includes("acceptPublisherInvitation,"),
    "public publisher action must not import the unlocked legacy acceptance helper",
  );
});
