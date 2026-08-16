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

test("publisher member control plane re-authorizes manage_members after live locks", () => {
  const state = source("src/features/publisher-workspace/member-control-state.ts");
  const authStart = state.indexOf("async function lockAuthorizedCaller");
  const authEnd = state.indexOf("export async function updatePublisherMemberLocked");
  const auth = state.slice(authStart, authEnd);
  const userLock = auth.indexOf("lockLiveUser(transaction, candidate.userId)");
  const publisherLock = auth.indexOf("lockLivePublisher(transaction, candidate.publisherId)");
  const membershipLock = auth.indexOf("lockMemberships(transaction, [candidate.id])");
  const permission = auth.indexOf('"manage_members"');

  assert.ok(userLock >= 0, "member control must lock live caller User");
  assert.ok(publisherLock > userLock, "member control must lock Publisher after User");
  assert.ok(membershipLock > publisherLock, "member control must lock caller Membership after Publisher");
  assert.ok(permission > membershipLock, "manage_members must be checked only after Membership lock");
  assertContains(state, "FOR UPDATE", "publisher member control row locks");
  assertContains(state, 'user.status !== "active"', "publisher member active-user guard");
  assertContains(state, "Boolean(user.isBanned)", "publisher member banned-user guard");
  assertContains(state, "user.deletedAt", "publisher member deleted-user guard");
  assertContains(state, "!Boolean(publisher.active)", "publisher member active-publisher guard");
  assertContains(state, "!Boolean(publisher.verified)", "publisher member verified-publisher guard");
  assertContains(state, "publisher.archivedAt", "publisher member archived-publisher guard");
});

test("member updates lock caller and target memberships in deterministic order", () => {
  const state = source("src/features/publisher-workspace/member-control-state.ts");
  const start = state.indexOf("export async function updatePublisherMemberLocked");
  const end = state.indexOf("export async function createPublisherInvitationLocked");
  const update = state.slice(start, end);

  assertContains(state, "Array.from(new Set(membershipIds)).sort()", "deterministic membership lock order");
  assertContains(update, "candidate.id,\n      input.memberId", "caller/target membership locks");
  assertContains(update, 'target.role === "owner"', "owner member protection");
  assertContains(update, "target.userId === user.id", "self member protection");
  assertContains(update, 'source: "publisher_member_updated"', "member update audit source");
});

test("invitation creation serializes on publisher and rechecks caller permission inside transaction", () => {
  const state = source("src/features/publisher-workspace/member-control-state.ts");
  const start = state.indexOf("export async function createPublisherInvitationLocked");
  const end = state.indexOf("export async function cancelPublisherInvitationLocked");
  const create = state.slice(start, end);
  const authorization = create.indexOf("lockAuthorizedCaller(transaction, candidate)");
  const pending = create.indexOf("publisherInvitation.findFirst");
  const insert = create.indexOf("publisherInvitation.create");

  assert.ok(authorization >= 0, "invitation create must re-authorize inside transaction");
  assert.ok(pending > authorization, "pending-invite check must run after publisher serialization lock");
  assert.ok(insert > pending, "invitation insert must run after serialized duplicate check");
  assertContains(create, 'source: "publisher_invitation_created"', "invitation create audit source");
});

test("invitation cancellation re-authorizes before locking pending invitation", () => {
  const state = source("src/features/publisher-workspace/member-control-state.ts");
  const start = state.indexOf("export async function cancelPublisherInvitationLocked");
  const cancel = state.slice(start);
  const authorization = cancel.indexOf("lockAuthorizedCaller(transaction, candidate)");
  const invitationLock = cancel.indexOf("FROM PublisherInvitation");
  const update = cancel.indexOf("publisherInvitation.updateMany");

  assert.ok(authorization >= 0, "invitation cancel must re-authorize inside transaction");
  assert.ok(invitationLock > authorization, "invitation must lock after live caller authorization");
  assert.ok(update > invitationLock, "pending invitation claim must happen after invitation lock");
  assertContains(cancel, 'invitation.status !== "pending"', "invitation pending-state guard");
  assertContains(cancel, 'source: "publisher_invitation_cancelled"', "invitation cancel audit source");
});

test("public publisher member actions cannot reconnect unlocked repository mutations", () => {
  const actions = source("src/features/publisher-workspace/actions.ts");

  assertContains(
    actions,
    'from "./member-control-state"',
    "publisher member locked-state import",
  );
  assertContains(actions, "updatePublisherMemberLocked({", "member update delegation");
  assertContains(actions, "createPublisherInvitationLocked({", "invitation create delegation");
  assertContains(actions, "cancelPublisherInvitationLocked({", "invitation cancel delegation");
  assert.ok(!actions.includes("updatePublisherMember,"), "actions must not import unlocked member update");
  assert.ok(!actions.includes("createPublisherInvitation,"), "actions must not import unlocked invite create");
  assert.ok(!actions.includes("cancelPublisherInvitation,"), "actions must not import unlocked invite cancel");
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
