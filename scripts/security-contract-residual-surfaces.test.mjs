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

test("obsolete publisher submission write helpers stay removed", () => {
  const repository = source("src/features/publisher-workspace/repository.ts");

  assertNotContains(
    repository,
    "updatePublisherSubmissionDecision",
    "publisher workspace repository",
  );
  assertNotContains(
    repository,
    "addPublisherInternalNote",
    "publisher workspace repository",
  );
});

test("obsolete publisher notification query helper stays removed", () => {
  const queries = source("src/features/publisher-workspace/queries.ts");
  const enhanced = source("src/features/publisher-workspace/notification-center.ts");

  assertNotContains(
    queries,
    "getPublisherNotificationCenter",
    "publisher workspace queries",
  );
  assert.ok(
    enhanced.includes("resolveNotificationTargets"),
    "publisher notification center must stay on the central target resolver",
  );
});
