import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function assertNotContains(text, fragment, label) {
  assert.ok(
    !text.includes(fragment),
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

test("obsolete publisher contract and publication repository writes stay removed", () => {
  const repository = source("src/features/publisher-workspace/repository.ts");

  assertNotContains(
    repository,
    "upsertPublisherContract",
    "publisher repository",
  );
  assertNotContains(
    repository,
    "upsertPublicationPlan",
    "publisher repository",
  );
});

test("editor notification reads stay on the central notification surface", () => {
  const queries = source("src/features/editor-workspace/queries.ts");
  const page = source("src/app/editor/bildirimler/page.tsx");

  assertNotContains(
    queries,
    "getEditorNotifications",
    "editor query repository",
  );
  assert.ok(
    page.includes("prisma.notification.findMany"),
    "editor notification page must read the full Notification row for safe target resolution",
  );
});
