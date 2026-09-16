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

function excludes(text, fragment, label) {
  assert.equal(
    text.includes(fragment),
    false,
    `${label} must not contain ${JSON.stringify(fragment)}`,
  );
}

test("every Writer entry route uses one full-book publication bridge", () => {
  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
    "src/app/kitap/[slug]/duzenle/layout.tsx",
  ]) {
    const layout = source(path);
    includes(
      layout,
      "WriterFullBookPublicationSubmitBridge",
      `${path} full-book submit bridge`,
    );
    includes(
      layout,
      "writer-publish-review-contrast.css",
      `${path} shared publication review contrast`,
    );
    excludes(
      layout,
      "WriterPublicationSnapshotGuard",
      `${path} legacy second publication gate`,
    );
  }
});

test("final confirmation derives the active layout from the same full-book preview", () => {
  const bridge = source(
    "src/features/writer/components/WriterFullBookPublicationSubmitBridge.tsx",
  );

  includes(
    bridge,
    "getWriterBookPublicationPreview",
    "single full-book preview source",
  );
  includes(
    bridge,
    'item.type === "chapter" && item.chapterId === chapterId',
    "active chapter selected from full-book snapshot",
  );
  includes(
    bridge,
    "chapter.content !== content",
    "final form content must match reviewed snapshot",
  );
  includes(
    bridge,
    "PUBLICATION_LAYOUT_INPUT_NAME",
    "server compatibility layout derives from reviewed snapshot",
  );
  includes(bridge, "MutationObserver", "preview form hydrated as soon as it mounts");
  includes(bridge, 'addEventListener("formdata"', "final submitted form is hydrated");
});

test("final publication review has explicit readable contrast", () => {
  const css = source("src/features/writer/writer-publish-review-contrast.css");

  includes(css, ".publish-preview", "preview surface contrast scope");
  includes(css, ".writer-publication-preview__review-heading", "review heading contrast");
  includes(css, ".writer-publication-preview__book-nav", "book navigation contrast");
  includes(css, ".button--primary", "final confirmation button contrast");
  includes(css, ".button--ghost", "return button contrast");
});
