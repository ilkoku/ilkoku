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

test("deletion center keeps row-column tables, responsive overflow and all safety actions", async () => {
  const [page, css] = await Promise.all([
    read("src/app/admin/silme-merkezi/page.tsx"),
    read("src/app/admin/deletion.css"),
  ]);
  for (const section of ["Yazar", "Eser", "Yayınevi", "Editör"]) {
    assert.match(page, new RegExp('aria-label="' + section + ' silme kayıtları"'));
  }
  assert.equal((page.match(/<table className="admin-delete-table">/g) || []).length, 4);
  assert.equal((page.match(/<thead><tr>/g) || []).length, 4);
  assert.equal((page.match(/<tbody>/g) || []).length, 4);
  assert.equal((page.match(/<th scope="row">/g) || []).length, 4);
  assert.equal((page.match(/tabIndex=\{0\}/g) || []).length, 4);
  for (const type of ["writer", "work", "publisher", "editor"]) {
    assert.match(page, new RegExp('targetType: "' + type + '"'));
  }
  for (const column of ["İlkOku ID / Durum", "Silme onayı", "Koruma", "Aktif erişim", "Başarılı sipariş"]) {
    assert.ok(page.includes(column), "column is preserved: " + column);
  }
  assert.match(page, /protectedByCommerce \? <span className="admin-delete-blocker">/);
  assert.match(page, /hasActiveReview \? <span className="admin-delete-blocker">/);
  assert.match(page, /blocked: hasActiveReview/);
  assert.match(page, /blocked: protectedByCommerce/);
  assert.match(page, /deleteFromAdminCenterAction/);
  assert.doesNotMatch(page, /admin-delete-card|admin-delete-grid/);
  assert.match(css, /\.admin-delete-table-scroll\s*\{/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /\.admin-delete-table\s*\{/);
  assert.match(css, /\.admin-delete-table \.admin-delete-form/);
  assert.doesNotMatch(css, /\.admin-delete-grid\s*\{/);
});
