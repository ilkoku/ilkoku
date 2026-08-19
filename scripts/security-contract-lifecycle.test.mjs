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

function assertNotContains(text, fragment, label) {
  assert.ok(
    !text.includes(fragment),
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

test("historical publisher contract lifecycle keeps its locked data-integrity state machine", () => {
  const text = source("src/features/publisher-contracts/lifecycle.ts");

  assertContains(text, "prisma.$transaction", "historical contract lifecycle");
  assertContains(text, "lockAuthorizedMembership", "historical contract lifecycle");
  assertContains(text, "lockAcceptedSubmission", "historical contract lifecycle");
  assert.ok(
    text.split("FOR UPDATE").length - 1 >= 2,
    "historical contract lifecycle must keep membership and submission row locks",
  );
  assertContains(text, '"manage_contract"', "historical contract lifecycle");
  assertContains(text, '"manage_publication_plan"', "publication lifecycle");
});

test("historical contract lifecycle still prevents destructive rollback and terminal overwrite", () => {
  const text = source("src/features/publisher-contracts/lifecycle.ts");

  assertContains(text, "contract_terminal", "historical contract lifecycle");
  assertContains(text, "sent_to_draft_forbidden", "historical contract lifecycle");
  assertContains(text, 'existing?.status === "accepted"', "historical contract lifecycle");
  assertContains(text, 'existing?.status === "rejected"', "historical contract lifecycle");
});

test("historical contract versions and publication notifications remain meaningful-change only", () => {
  const text = source("src/features/publisher-contracts/lifecycle.ts");

  assertContains(text, "changedFields.length === 0", "historical contract lifecycle");
  assertContains(text, "version: { increment: 1 }", "historical contract lifecycle");
  assertContains(text, "publisher_contract_created", "historical contract audit");
  assertContains(text, "publisher_contract_updated", "historical contract audit");
  assertContains(text, "publisher_contract_sent", "historical contract audit");
  assertContains(text, "publisher_publication_plan_created", "publication audit");
  assertContains(text, "publisher_publication_plan_updated", "publication audit");
});

test("legacy publisher contract sending is retired and cannot emit new contract email deliveries", () => {
  const actions = source("src/features/publisher-contracts/actions.ts");
  const component = source("src/features/publisher-workspace/components/PublisherContractCenter.tsx");

  assertContains(
    actions,
    "Yeni sözleşmeler yalnız İlkOku merkezi Sözleşme Yönetimi üzerinden Admin tarafından hazırlanır ve gönderilir.",
    "publisher contract write guard",
  );
  assertNotContains(actions, "sendPublisherContractEmail", "retired publisher contract email path");
  assertNotContains(actions, "savePublisherContractLifecycle", "retired publisher contract lifecycle write path");
  assertNotContains(component, "saveSecurePublisherContractAction", "retired publisher contract form");
  assertContains(component, "saveSecurePublicationPlanAction", "live publication plan form");
});

test("stale contract compatibility action cannot bypass central contract management", () => {
  const text = source("src/features/publisher-workspace/actions.ts");

  assertContains(text, "saveSecurePublisherContractAction", "contract compatibility action");
  assertContains(text, "saveSecurePublicationPlanAction", "publication compatibility action");
  assertNotContains(text, "upsertPublisherContract({", "contract compatibility action");
  assertNotContains(text, "upsertPublicationPlan({", "publication compatibility action");
});

test("writer publisher workspace is live and hides internal draft contracts and plan notes", () => {
  const route = source("src/app/yayinevleri/page.tsx");
  const query = source("src/features/publishers/queries.ts");
  const workspace = source("src/features/publishers/components/PublisherWorkspace.tsx");
  const navigation = source("src/content/navigation.ts");

  assertContains(route, 'profile.role !== "writer"', "writer publisher route");
  assertContains(route, "<PublisherWorkspace", "writer publisher route");
  assertNotContains(route, 'redirect("/yazar")', "writer publisher route");
  assertContains(query, 'item.contract.status !== "draft"', "writer publisher query");
  assertNotContains(query, "item.publicationPlan.notes", "writer publisher query");
  assertContains(workspace, "focusedSubmissionId", "writer publisher workspace");
  assertContains(workspace, "item.contract", "writer publisher workspace");
  assertContains(workspace, "item.publicationPlan", "writer publisher workspace");
  assertNotContains(workspace, "item.publicationPlan.notes", "writer publisher workspace");
  assertContains(navigation, '{ label: "Yayınevleri", href: "/yayinevleri" }', "writer navigation");
});

test("admin audit explains historical publisher contract and publication sources", () => {
  const text = source("src/app/admin/audit-log/page.tsx");

  for (const event of [
    "publisher_contract_created",
    "publisher_contract_updated",
    "publisher_contract_sent",
    "publisher_publication_plan_created",
    "publisher_publication_plan_updated",
  ]) {
    assertContains(text, event, "admin historical contract lifecycle labels");
  }
});

test("publisher file downloads re-authorize, lock and audit before redirect", () => {
  const helper = source("src/features/publisher-submissions/file-download.ts");
  const route = source("src/app/yayinevi/dosyalar/[fileId]/indir/route.ts");
  const audit = source("src/app/admin/audit-log/page.tsx");

  assertContains(helper, "prisma.$transaction", "publisher file download");
  assertContains(helper, "lockDownloadPermission", "publisher file download");
  assertContains(helper, '"download_files"', "publisher file download");
  assert.ok(
    helper.split("FOR UPDATE").length - 1 >= 2,
    "publisher file download must lock membership and file/submission state",
  );
  assertContains(helper, "auditLog.create", "publisher file download audit");
  assertContains(helper, "publisher_submission_file_downloaded", "publisher file download audit");
  assertContains(route, "authorizeAuditedPublisherFileDownload", "publisher file download route");
  assertNotContains(route, "getLegacyPublisherFileForDownload", "publisher file download route");
  assertContains(audit, "publisher_submission_file_downloaded", "admin file download audit label");
});

test("second editor draft and completion share one locked live state machine", () => {
  const state = source("src/features/editor-workspace/second-editor-review-state.actions.ts");
  const email = source("src/features/editor-workspace/second-editor-email.actions.ts");

  assertContains(state, "lockLiveSecondReviewContext", "second editor review state");
  assert.ok(
    state.split("FOR UPDATE").length - 1 >= 3,
    "second editor state must lock editor, assignment and work rows",
  );
  assertContains(state, 'editor.status !== "active"', "second editor live authorization");
  assertContains(state, 'assignment.status === "assigned" || assignment.status === "in_progress"', "second editor terminal-state guard");
  assertContains(state, 'existing?.reportStatus === "completed"', "second editor completed-report downgrade guard");
  assertContains(email, 'from "./second-editor-review-state.actions"', "second editor canonical write path");
  assertNotContains(email, "completeSecondEditorReviewAction as completeSecondEditorReviewCoreAction,\n  saveSecondEditorReviewDraftAction,\n  sendToSecondEditorAction", "second editor legacy write import");
});

test("first editor draft and completion share one locked live state machine", () => {
  const state = source("src/features/editor-workspace/first-editor-review-state.actions.ts");
  const tools = source("src/features/editor-workspace/components/ProfessionalReviewTools.tsx");
  const submit = source("src/features/editor-workspace/first-review-submit.actions.ts");

  assertContains(state, "lockLiveFirstReviewContext", "first editor review state");
  assert.ok(
    state.split("FOR UPDATE").length - 1 >= 3,
    "first editor state must lock editor, assignment and work rows",
  );
  assertContains(state, 'editor.status !== "active"', "first editor live authorization");
  assertContains(state, 'assignment.status === "in_progress"', "first editor terminal-state guard");
  assertContains(state, 'existing?.reportStatus === "completed"', "first editor completed-report downgrade guard");
  assertContains(tools, "saveFirstEditorReviewDraftAction", "first editor canonical draft path");
  assertNotContains(tools, "saveProfessionalReviewDraftAction", "first editor legacy draft path");
  assertContains(submit, "completeFirstEditorReviewStateAction", "first editor canonical completion path");
  assertNotContains(submit, 'from "./editor-workflow.actions"', "first editor legacy completion path");
});
