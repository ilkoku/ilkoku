import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");

test("Reader publication snapshot lookup fails soft instead of taking /oku down", () => {
  const snapshots = source("src/features/works/publication-snapshots.ts");

  assert.ok(
    snapshots.includes("PUBLICATION_SNAPSHOT_READ_FAILED"),
    "snapshot runtime failures must have a stable server diagnostic marker",
  );
  assert.ok(
    snapshots.includes('reportSnapshotReadFailure("single"'),
    "single chapter snapshot lookup must fail soft",
  );
  assert.ok(
    snapshots.includes('reportSnapshotReadFailure("batch"'),
    "work chapter snapshot lookup must fail soft",
  );
  assert.equal(
    snapshots.includes("startsWith: PUBLICATION_VERSION_DESCRIPTION_PREFIX"),
    false,
    "reserved publication marker must not be pushed into a DB startsWith predicate",
  );
  assert.ok(
    snapshots.includes("version.description?.startsWith(PUBLICATION_VERSION_DESCRIPTION_PREFIX)"),
    "reserved publication marker must be validated in application code",
  );
});

test("production error boundary exposes only the safe Next digest", () => {
  const errorPage = source("src/app/error.tsx");

  assert.ok(errorPage.includes("error.digest"), "safe Next digest must be read");
  assert.ok(errorPage.includes("Hata kodu:"), "safe error code must be visible to the user");
  assert.equal(
    errorPage.includes("error.message"),
    false,
    "production error page must not expose raw exception messages",
  );
  assert.equal(
    errorPage.includes("error.stack"),
    false,
    "production error page must not expose stack traces",
  );
});
