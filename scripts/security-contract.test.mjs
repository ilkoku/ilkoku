import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function loadPureTypeScriptModule(relativePath) {
  const filename = join(ROOT, relativePath);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;

  const commonJsModule = { exports: {} };
  const runtimeRequire = (specifier) => {
    throw new Error(
      `Security contract expected a pure module but ${relativePath} required ${specifier} at runtime.`,
    );
  };

  new Function("require", "module", "exports", compiled)(
    runtimeRequire,
    commonJsModule,
    commonJsModule.exports,
  );

  return commonJsModule.exports;
}

function sorted(values) {
  return [...values].sort();
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

const publisherPolicy = loadPureTypeScriptModule(
  "src/features/publisher-workspace/permissions.ts",
);

const {
  customizablePublisherPermissionKeys,
  getCustomizablePublisherPermissions,
  getPublisherPermissions,
  hasPublisherPermission,
  publisherPermissionGroups,
  publisherPermissionKeys,
} = publisherPolicy;

const expectedRolePermissions = {
  owner: publisherPermissionKeys,
  manager: [
    "view_submission",
    "decide_submission",
    "add_internal_note",
    "download_file",
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
    "view_publisher_audit",
  ],
  submissions_manager: [
    "view_submission",
    "decide_submission",
    "add_internal_note",
    "download_file",
    "discover_works",
    "discover_authors",
    "share_internal",
    "view_shared_items",
    "add_share_note",
    "request_editor_review",
    "view_editor_requests",
    "view_authorized_passport",
    "view_authorized_content",
    "view_files",
    "download_files",
  ],
  editorial: [
    "view_shared_items",
    "view_authorized_passport",
    "view_authorized_content",
    "view_files",
  ],
  contract_manager: [
    "manage_contract",
    "manage_publication_plan",
    "view_shared_items",
    "view_files",
    "download_files",
  ],
  reviewer: ["view_shared_items"],
  viewer: ["view_shared_items"],
};

test("publisher permission universe is unique and grouped modern permissions are complete", () => {
  assert.equal(
    new Set(publisherPermissionKeys).size,
    publisherPermissionKeys.length,
    "publisherPermissionKeys must not contain duplicates",
  );

  const grouped = publisherPermissionGroups.flatMap(
    (group) => group.permissions,
  );

  assert.deepEqual(
    sorted(grouped),
    sorted(customizablePublisherPermissionKeys),
    "permission groups must cover every customizable permission exactly once",
  );
  assert.equal(new Set(grouped).size, grouped.length);
});

test("publisher default role matrix stays least-privilege", () => {
  for (const [role, expected] of Object.entries(expectedRolePermissions)) {
    assert.deepEqual(
      sorted(getPublisherPermissions(role)),
      sorted(expected),
      `${role} default permissions changed`,
    );
  }
});

test("owner ignores overrides and always retains the full permission universe", () => {
  assert.deepEqual(
    sorted(getPublisherPermissions("owner", [])),
    sorted(publisherPermissionKeys),
  );
  assert.deepEqual(
    sorted(getPublisherPermissions("owner", ["view_shared_items"])),
    sorted(publisherPermissionKeys),
  );
});

test("custom overrides cannot grant legacy or protected permissions", () => {
  const manager = getPublisherPermissions("manager", [
    "view_files",
    "download_files",
    "view_submission",
    "manage_contract",
    "not_a_permission",
  ]);

  assert.deepEqual(sorted(manager), sorted(["view_files", "download_files"]));
  assert.equal(hasPublisherPermission("manager", "view_submission", ["view_files"]), false);
  assert.equal(hasPublisherPermission("manager", "manage_contract", ["view_files"]), false);
});

test("contract-manager protected permissions survive customizable overrides", () => {
  const permissions = getPublisherPermissions(
    "contract_manager",
    ["view_shared_items"],
  );

  assert.deepEqual(
    sorted(permissions),
    sorted([
      "manage_contract",
      "manage_publication_plan",
      "view_shared_items",
    ]),
  );
});

test("customizable permission projection never exposes transition-only keys", () => {
  const projected = getCustomizablePublisherPermissions("manager");
  for (const key of [
    "view_submission",
    "decide_submission",
    "add_internal_note",
    "download_file",
    "manage_contract",
    "manage_publication_plan",
  ]) {
    assert.equal(projected.includes(key), false, `${key} leaked into customizable permissions`);
  }
});

test("session validation fails closed for unavailable accounts", () => {
  const text = source("src/lib/auth/current-user.ts");
  assertContains(text, 'session.user.status !== "active"', "current-user session guard");
  assertContains(text, "session.user.isBanned", "current-user session guard");
  assertContains(text, "session.user.deletedAt !== null", "current-user session guard");
  assertContains(text, "session.expiresAt <= new Date()", "current-user session guard");
});

test("admin workspace remains role-gated", () => {
  const text = source("src/app/admin/layout.tsx");
  assertContains(text, 'user.role !== "admin"', "admin layout");
});

test("canonical publish keeps work publication and audit inside one locked transaction", () => {
  const text = source("src/features/works/publish-work-event.ts");
  assertContains(text, "prisma.$transaction", "canonical publish");
  assertContains(text, "FOR UPDATE", "canonical publish");
  assertContains(text, "transaction.chapter.update", "canonical publish");
  assertContains(text, "transaction.work.update", "canonical publish");
  assertContains(text, 'action: "work_published"', "canonical publish");
});

test("publisher editor workflow keeps central row-lock state transitions", () => {
  const text = source("src/features/publisher-editor-requests/repository.ts");
  assertContains(text, "lockPublisherEditorRequest", "publisher editor workflow");
  assertContains(text, "lockActiveEditor", "publisher editor workflow");
  assertContains(text, "lockAndValidateEligibleWork", "publisher editor workflow");
  assertContains(text, "FOR UPDATE", "publisher editor workflow");
  assertContains(text, "PUBLISHER_EDITOR_REQUEST_STATE_CHANGED", "publisher editor workflow");
});

test("external publisher sharing keeps deterministic email idempotency and abuse controls", () => {
  const sharing = source("src/features/publisher-discovery/sharing-repository.ts");
  const email = source("src/lib/email/send-email.ts");

  assertContains(sharing, "publisher-discovery-share:", "publisher discovery sharing");
  assertContains(sharing, "EMAIL_SHARE_BURST_LIMIT", "publisher discovery sharing");
  assertContains(sharing, "EMAIL_SHARE_RECIPIENT_COOLDOWN_MS", "publisher discovery sharing");
  assertContains(email, "EMAIL_IDEMPOTENCY_ATTACH_FAILED", "email send idempotency");
  assertContains(email, "claimFailed", "email send idempotency");
});

test("writer comment export stays writer-only, no-store and snapshot-bound", () => {
  const text = source("src/app/yorumlarim/disa-aktar/csv/route.ts");
  assertContains(text, 'writer.role !== "writer"', "writer CSV export");
  assertContains(text, 'writer.status !== "active"', "writer CSV export");
  assertContains(text, '"Cache-Control": "private, no-store"', "writer CSV export");
  assertContains(text, "createdAtLte: exportCutoff", "writer CSV export");
  assertContains(text, "[=+\\-@]", "writer CSV formula guard");
});

test("legacy publisher writer mutations have only the canonical write path", () => {
  const mutations = source("src/features/publishers/mutations.ts");
  const repository = source("src/features/publishers/repository.ts");

  assertContains(
    mutations,
    "publisher-submissions/legacy-security",
    "writer publisher mutations",
  );
  assertContains(mutations, "createLegacyPublisherSubmission", "writer publisher mutations");
  assertContains(mutations, "withdrawLegacyPublisherSubmission", "writer publisher mutations");
  assertNotContains(repository, "insertSubmission", "publisher read repository");
  assertNotContains(repository, "withdrawAuthorSubmission", "publisher read repository");
});

test("stale publisher server-action names delegate to the canonical secure actions", () => {
  const text = source("src/features/publisher-workspace/actions.ts");
  assertContains(text, "updateSecurePublisherDecisionAction", "publisher compatibility actions");
  assertContains(text, "addSecurePublisherInternalNoteAction", "publisher compatibility actions");
  assertNotContains(text, "updatePublisherSubmissionDecision({", "publisher compatibility actions");
  assertNotContains(text, "addPublisherInternalNote({", "publisher compatibility actions");
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
