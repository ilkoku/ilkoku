import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin deletion center is reachable from system navigation", async () => {
  const [navigation, page] = await Promise.all([
    read("src/lib/admin-navigation.ts"),
    read("src/app/admin/silme-merkezi/page.tsx"),
  ]);

  assert.match(navigation, /\/silme-merkezi/);
  assert.match(navigation, /Silme Merkezi/);
  assert.match(page, /Yazar silme/);
  assert.match(page, /Eser silme/);
  assert.match(page, /Yayınevi silme/);
  assert.match(page, /Editör silme/);
  assert.match(page, /Onay için SİL yaz/);
  assert.match(page, /Arşiv Merkezi/);
});

test("deletion center uses reversible removal and preserves protected records", async () => {
  const action = await read("src/features/admin/deletion-actions.ts");

  assert.match(action, /currentUser\.role !== "admin"/);
  assert.match(action, /DELETE_CONFIRMATION = "SİL"/);
  assert.match(action, /deletedAt: now/);
  assert.match(action, /status: "disabled"/);
  assert.match(action, /transaction\.session\.deleteMany/);
  assert.match(action, /status: "archived"/);
  assert.match(action, /active: false/);
  assert.match(action, /status: "active"/);
  assert.match(action, /status: "paid"/);
  assert.match(action, /\["waiting", "assigned", "in_progress"\]/);
  assert.match(action, /source: "admin_deletion_center"/);

  assert.doesNotMatch(action, /transaction\.user\.delete\(/);
  assert.doesNotMatch(action, /transaction\.work\.delete\(/);
  assert.doesNotMatch(action, /transaction\.publisher\.delete\(/);
});

test("deletion center UI exposes dependency blockers before destructive actions", async () => {
  const page = await read("src/app/admin/silme-merkezi/page.tsx");

  assert.match(page, /protectedByCommerce/);
  assert.match(page, /hasActiveReview/);
  assert.match(page, /Silme korumalı/);
  assert.match(page, /aktif okur erişim hakkı/);
  assert.match(page, /Aktif inceleme/);
});
