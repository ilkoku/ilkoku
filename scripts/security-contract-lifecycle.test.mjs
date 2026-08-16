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

test("contract and publication writes re-authorize and lock accepted submission state", () => {
  const text = source("src/features/publisher-contracts/lifecycle.ts");

  assertContains(text, "prisma.$transaction", "contract lifecycle");
  assertContains(text, "lockAuthorizedMembership", "contract lifecycle");
  assertContains(text, "lockAcceptedSubmission", "contract lifecycle");
  assert.ok(
    text.split("FOR UPDATE").length - 1 >= 2,
    "contract lifecycle must keep membership and submission row locks",
  );
  assertContains(text, '"manage_contract"', "contract lifecycle");
  assertContains(text, '"manage_publication_plan"', "publication lifecycle");
});

test("contract lifecycle prevents destructive rollback and terminal overwrite", () => {
  const text = source("src/features/publisher-contracts/lifecycle.ts");

  assertContains(text, "contract_terminal", "contract lifecycle");
  assertContains(text, "sent_to_draft_forbidden", "contract lifecycle");
  assertContains(text, 'existing?.status === "accepted"', "contract lifecycle");
  assertContains(text, 'existing?.status === "rejected"', "contract lifecycle");
});

test("contract versions and publication notifications are meaningful-change only", () => {
  const text = source("src/features/publisher-contracts/lifecycle.ts");

  assertContains(text, "changedFields.length === 0", "contract lifecycle");
  assertContains(text, "version: { increment: 1 }", "contract lifecycle");
  assertContains(text, "publisher_contract_created", "contract audit");
  assertContains(text, "publisher_contract_updated", "contract audit");
  assertContains(text, "publisher_contract_sent", "contract audit");
  assertContains(text, "publisher_publication_plan_created", "publication audit");
  assertContains(text, "publisher_publication_plan_updated", "publication audit");
});

test("contract email is version-idempotent and points to a live writer workspace", () => {
  const lifecycle = source("src/features/publisher-contracts/lifecycle.ts");
  const emails = source("src/lib/email/publisher-emails.ts");

  assertContains(lifecycle, "publisher-contract:${contract.id}:v${contract.version}", "contract lifecycle idempotency");
  assertContains(emails, "idempotencyKey: input.idempotencyKey", "contract email");
  assertContains(emails, "/yayinevleri?basvuru=", "publisher emails");
  assertNotContains(emails, "/yazar?yayineviBasvuru=", "publisher emails");
});

test("stale contract server-action names cannot bypass the canonical lifecycle", () => {
  const text = source("src/features/publisher-workspace/actions.ts");

  assertContains(text, "saveSecurePublisherContractAction", "contract compatibility action");
  assertContains(text, "saveSecurePublicationPlanAction", "publication compatibility action");
  assertNotContains(text, "upsertPublisherContract({", "contract compatibility action");
  assertNotContains(text, "upsertPublicationPlan({", "publication compatibility action");
});

test("writer publisher workspace is live and hides internal draft contracts", () => {
  const route = source("src/app/yayinevleri/page.tsx");
  const query = source("src/features/publishers/queries.ts");
  const workspace = source("src/features/publishers/components/PublisherWorkspace.tsx");
  const navigation = source("src/content/navigation.ts");

  assertContains(route, 'profile.role !== "writer"', "writer publisher route");
  assertContains(route, "<PublisherWorkspace", "writer publisher route");
  assertNotContains(route, 'redirect("/yazar")', "writer publisher route");
  assertContains(query, 'item.contract.status !== "draft"', "writer publisher query");
  assertContains(workspace, "focusedSubmissionId", "writer publisher workspace");
  assertContains(workspace, "item.contract", "writer publisher workspace");
  assertContains(workspace, "item.publicationPlan", "writer publisher workspace");
  assertContains(navigation, '{ label: "Yayınevleri", href: "/yayinevleri" }', "writer navigation");
});

test("admin audit explains contract and publication sources", () => {
  const text = source("src/app/admin/audit-log/page.tsx");

  for (const event of [
    "publisher_contract_created",
    "publisher_contract_updated",
    "publisher_contract_sent",
    "publisher_publication_plan_created",
    "publisher_publication_plan_updated",
  ]) {
    assertContains(text, event, "admin contract lifecycle labels");
  }
});
