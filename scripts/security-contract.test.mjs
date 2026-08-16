import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function extractArrayBody(text, exportName) {
  const match = text.match(
    new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\] as const`),
  );

  assert.ok(match, `${exportName} could not be parsed`);
  return match[1];
}

function quotedStrings(text) {
  return [...text.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function defaultRoleSet(text, role) {
  const match = text.match(
    new RegExp(`${role}: new Set\\(\\[([\\s\\S]*?)\\]\\)`),
  );

  assert.ok(match, `${role} default permission set could not be parsed`);

  const direct = quotedStrings(match[1]);
  const legacy = match[1].includes("...legacyTransitionPermissionKeys")
    ? ["view_submission", "decide_submission", "add_internal_note", "download_file"]
    : [];
  const protectedPermissions = match[1].includes("...protectedContractPermissionKeys")
    ? ["manage_contract", "manage_publication_plan"]
    : [];

  return new Set([...legacy, ...protectedPermissions, ...direct]);
}

function assertContains(text, fragment, label) {
  assert.ok(
    text.includes(fragment),
    `${label} must contain ${JSON.stringify(fragment)}`,
  );
}

function assertNotContains(text, fragment, label) {
  assert.ok(
    !text.includes(fragment),
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

const permissionsSource = source(
  "src/features/publisher-workspace/permissions.ts",
);

const expectedCustomizable = new Set([
  "discover_works",
  "discover_authors",
  "like_work",
  "like_author",
  "favorite_work",
  "favorite_author",
  "follow_author",
  "share_internal",
  "share_email",
  "view_shared_items",
  "add_share_note",
  "request_editor_review",
  "view_editor_requests",
  "view_authorized_passport",
  "view_authorized_content",
  "view_files",
  "download_files",
  "manage_members",
  "manage_permissions",
  "view_publisher_audit",
]);

const expectedLegacy = new Set([
  "view_submission",
  "decide_submission",
  "add_internal_note",
  "download_file",
]);

const expectedProtected = new Set([
  "manage_contract",
  "manage_publication_plan",
]);

test("publisher permission universe is unique and grouped modern permissions are complete", () => {
  const customizable = quotedStrings(
    extractArrayBody(permissionsSource, "customizablePublisherPermissionKeys"),
  );
  const legacy = quotedStrings(
    permissionsSource.match(
      /const legacyTransitionPermissionKeys = \[([\s\S]*?)\] as const/,
    )?.[1] ?? "",
  );
  const protectedPermissions = quotedStrings(
    permissionsSource.match(
      /const protectedContractPermissionKeys = \[([\s\S]*?)\] as const/,
    )?.[1] ?? "",
  );

  assert.deepEqual(new Set(customizable), expectedCustomizable);
  assert.deepEqual(new Set(legacy), expectedLegacy);
  assert.deepEqual(new Set(protectedPermissions), expectedProtected);
  assert.equal(
    customizable.length + legacy.length + protectedPermissions.length,
    new Set([...customizable, ...legacy, ...protectedPermissions]).size,
    "permission keys must stay unique",
  );
});

test("publisher default role matrix stays least-privilege", () => {
  const manager = defaultRoleSet(permissionsSource, "manager");
  const submissionsManager = defaultRoleSet(
    permissionsSource,
    "submissions_manager",
  );
  const editorial = defaultRoleSet(permissionsSource, "editorial");
  const contractManager = defaultRoleSet(
    permissionsSource,
    "contract_manager",
  );
  const reviewer = defaultRoleSet(permissionsSource, "reviewer");
  const viewer = defaultRoleSet(permissionsSource, "viewer");

  assert.equal(manager.has("manage_permissions"), false);
  assert.equal(manager.has("manage_contract"), false);
  assert.equal(manager.has("manage_publication_plan"), false);

  assert.equal(submissionsManager.has("decide_submission"), true);
  assert.equal(submissionsManager.has("manage_members"), false);
  assert.equal(submissionsManager.has("share_email"), false);

  assert.deepEqual(
    editorial,
    new Set([
      "view_shared_items",
      "view_authorized_passport",
      "view_authorized_content",
      "view_files",
    ]),
  );

  assert.deepEqual(
    contractManager,
    new Set([
      "manage_contract",
      "manage_publication_plan",
      "view_shared_items",
      "view_files",
      "download_files",
    ]),
  );

  assert.deepEqual(reviewer, new Set(["view_shared_items"]));
  assert.deepEqual(viewer, new Set(["view_shared_items"]));
});

test("owner ignores overrides and always retains the full permission universe", () => {
  assertContains(
    permissionsSource,
    'if (role === "owner")',
    "owner override protection",
  );
  assertContains(
    permissionsSource,
    "return [...defaults]",
    "owner override protection",
  );
});

test("custom overrides cannot grant legacy or protected permissions", () => {
  assertContains(
    permissionsSource,
    "customizablePermissionSet.has",
    "override parser",
  );

  for (const permission of [...expectedLegacy, ...expectedProtected]) {
    assert.equal(
      expectedCustomizable.has(permission),
      false,
      `${permission} must not be customizable`,
    );
  }
});

test("contract-manager protected permissions survive customizable overrides", () => {
  assertContains(
    permissionsSource,
    "protectedPermissions",
    "protected permission projection",
  );
  assertContains(
    permissionsSource,
    "...protectedPermissions",
    "protected permission projection",
  );
});

test("customizable permission projection never exposes transition-only keys", () => {
  const customizable = quotedStrings(
    extractArrayBody(permissionsSource, "customizablePublisherPermissionKeys"),
  );

  for (const permission of [...expectedLegacy, ...expectedProtected]) {
    assert.equal(customizable.includes(permission), false);
  }
});

test("session validation fails closed for unavailable accounts", () => {
  const sessionSource = source("src/lib/auth/current-user.ts");

  assertContains(sessionSource, 'session.user.status !== "active"', "session validation");
  assertContains(sessionSource, "session.user.isBanned", "session validation");
  assertContains(sessionSource, "session.user.deletedAt !== null", "session validation");
});

test("admin workspace remains role-gated", () => {
  const adminLayout = source("src/app/admin/layout.tsx");
  assertContains(adminLayout, 'profile.role !== "admin"', "admin layout");
});

test("canonical publish keeps work publication and audit inside one locked transaction", () => {
  const text = source("src/features/works/publish-work-event.ts");
  assertContains(text, "FOR UPDATE", "canonical publish");
  assertContains(text, "transaction.chapter.update", "canonical publish");
  assertContains(text, "transaction.work.update", "canonical publish");
  assertContains(text, 'action: "work_published"', "canonical publish");
});

test("publisher editor workflow keeps central row-lock state transitions", () => {
  const text = source("src/features/publisher-editor-requests/repository.ts");
  assertContains(text, "lockPublisherEditorRequest", "publisher editor workflow");
  assertContains(text, "FOR UPDATE", "publisher editor workflow");
  assertContains(text, "activeKey: null", "publisher editor workflow");
});

test("external publisher sharing keeps deterministic email idempotency and abuse controls", () => {
  const sharing = source("src/features/publisher-discovery/sharing-repository.ts");
  const email = source("src/lib/email/send-email.ts");
  assertContains(sharing, "publisher-discovery-share:${share.id}", "publisher sharing");
  assertContains(sharing, "EMAIL_SHARE_BURST_LIMIT", "publisher sharing");
  assertContains(email, "idempotencyKey", "email delivery");
});

test("writer comment export stays writer-only, no-store and snapshot-bound", () => {
  const route = source("src/app/yorumlarim/disa-aktar/csv/route.ts");
  assertContains(route, 'writer.role !== "writer"', "writer comment export");
  assertContains(route, '"Cache-Control": "private, no-store"', "writer comment export");
  assertContains(route, "exportCutoff", "writer comment export");
});

test("legacy publisher writer mutations have only the canonical write path", () => {
  const publisherMutationSource = source("src/features/publishers/mutations.ts");
  assertContains(
    publisherMutationSource,
    "createLegacyPublisherSubmission",
    "publisher submission creation",
  );
  assertContains(
    publisherMutationSource,
    "withdrawLegacyPublisherSubmission",
    "publisher submission withdrawal",
  );
});

test("stale publisher server-action names delegate to the canonical secure actions", () => {
  const text = source("src/features/publisher-workspace/actions.ts");
  assertContains(text, "updateSecurePublisherDecisionAction", "legacy publisher actions");
  assertContains(text, "addSecurePublisherInternalNoteAction", "legacy publisher actions");
});

test("legacy publisher lifecycle is row-locked, auditable and permission-scoped", () => {
  const text = source("src/features/publisher-submissions/legacy-security.ts");
  const lockCount = text.split("FOR UPDATE").length - 1;
  assert.ok(lockCount >= 3, "legacy publisher lifecycle lost a database lock");
  assertContains(text, '"decide_submission"', "legacy publisher security bridge");
  assertContains(text, '"add_internal_note"', "legacy publisher security bridge");
  assertContains(text, '"view_files"', "legacy publisher security bridge");
  assertContains(text, '"download_files"', "legacy publisher security bridge");
  assertContains(text, "isPublisherAdminReadOnlyMembership", "legacy publisher security bridge");
  assertContains(text, "publisher_submission_created", "legacy publisher security bridge");
  assertContains(text, "publisher_submission_withdrawn", "legacy publisher security bridge");
  assertContains(text, "publisher_submission_decision_updated", "legacy publisher security bridge");
  assertContains(text, "publisher_submission_internal_note_added", "legacy publisher security bridge");
});

test("publisher sensitive routes preserve granular capability gates", () => {
  const detail = source(
    "src/features/publisher-workspace/components/PublisherSubmissionDetail.tsx",
  );
  const passport = source(
    "src/app/yayinevi/basvurular/[submissionId]/pasaport/page.tsx",
  );
  const download = source(
    "src/app/yayinevi/dosyalar/[fileId]/indir/route.ts",
  );
  const auditedDownload = source(
    "src/features/publisher-submissions/file-download.ts",
  );

  assertContains(detail, "viewAuthorizedContent", "publisher submission detail");
  assertContains(detail, "viewAuthorizedPassport", "publisher submission detail");
  assertContains(detail, "viewFiles", "publisher submission detail");
  assertContains(detail, "downloadFiles", "publisher submission detail");
  assertContains(passport, "viewAuthorizedPassport", "publisher passport route");
  assertContains(download, "authorizeAuditedPublisherFileDownload", "publisher file download route");
  assertContains(auditedDownload, '"download_files"', "publisher file download authorization");
  assertContains(download, '"Cache-Control": "private, no-store"', "publisher file download route");
  assertContains(download, '"X-Content-Type-Options": "nosniff"', "publisher file download route");
});

test("admin audit log keeps source-aware publisher workflow labels", () => {
  const text = source("src/app/admin/audit-log/page.tsx");
  for (const event of [
    "publisher_submission_created",
    "publisher_submission_withdrawn",
    "publisher_submission_decision_updated",
    "publisher_submission_internal_note_added",
    "publisher_submission_file_downloaded",
    "publisher_editor_request_created",
    "publisher_editor_request_claimed",
    "publisher_editor_request_completed",
  ]) {
    assertContains(text, event, "admin audit workflow labels");
  }
});
