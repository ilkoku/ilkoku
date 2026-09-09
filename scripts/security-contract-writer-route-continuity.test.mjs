import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");

function includes(text, fragment, label) {
  assert.ok(
    text.includes(fragment),
    `${label} must contain ${JSON.stringify(fragment)}`,
  );
}

test("continue-writing list stays inside the writer content width", () => {
  const page = source("src/app/yazmaya-devam/page.tsx");
  const css = source("src/app/yazmaya-devam/continue-writing-list.css");

  includes(page, "continue-writing-list-workspace", "route-scoped alignment hook");
  includes(page, 'import "./continue-writing-list.css"', "route-scoped alignment stylesheet");
  includes(css, ".continue-writing-list-workspace .editor-page-header", "header alignment");
  includes(css, ".continue-writing-list-workspace .editor-works-table", "table alignment");
  includes(css, "min-width: 0", "desktop table min-width reset");
  includes(css, "table-layout: fixed", "desktop table fixed layout");
});

test("feedback and publisher loading keep the authenticated writer shell mounted", () => {
  for (const route of ["geri-bildirimler", "yayinevleri"]) {
    const layout = source(`src/app/${route}/layout.tsx`);
    const page = source(`src/app/${route}/page.tsx`);
    const loading = source(`src/app/${route}/loading.tsx`);

    includes(layout, "AppShell", `${route} persistent app shell`);
    includes(layout, "getCurrentProfile", `${route} authenticated shell profile`);
    assert.equal(
      page.includes("<AppShell"),
      false,
      `${route} page must not remount the app shell after data loading`,
    );
    assert.equal(
      loading.includes("feedback-loading"),
      false,
      `${route} loading state must not replace the full viewport with the legacy loader`,
    );
  }
});

test("writer route data fetches avoid unnecessary payload and duplicate profile reads", () => {
  const profile = source("src/features/auth/profile.ts");
  const feedback = source("src/features/feedback/repository/feedback.repository.ts");
  const publishers = source("src/features/publishers/repository.ts");

  includes(profile, 'import { cache } from "react"', "request profile cache");
  includes(profile, "getCurrentProfileCached", "shared profile promise");
  includes(feedback, "select: {", "feedback scalar projection");
  includes(publishers, "acceptsSubmissions: true", "publisher list projection");
  includes(publishers, "targetPublicationDate: true", "submission publication projection");
});
