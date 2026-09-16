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

test("publish preview renders the author's exact saved publication layout", () => {
  const enhancer = source(
    "src/features/writer/components/WriterPublishExperienceEnhancer.tsx",
  );
  const css = source("src/features/writer/writer-publish-experience.css");

  includes(enhancer, "PublishedManuscriptViewport", "reader-equivalent preview renderer");
  includes(enhancer, "parsePublicationLayout", "author snapshot validation");
  includes(enhancer, "PUBLICATION_LAYOUT_INPUT_NAME", "exact publication layout input");
  includes(enhancer, "parsed.content", "current author content binding");
  includes(css, ".preview-article:has(> .writer-publication-preview)", "legacy preview replacement");
});

test("direct publish is gated by a saved reader preview before final confirmation", () => {
  const gate = source(
    "src/features/writer/components/WriterFullBookPublicationEnhancer.tsx",
  );
  const writer = source("src/content/writer.ts");

  includes(gate, "routePublishThroughFinalReview", "mandatory final review route");
  includes(gate, "ensureDraftSaved", "draft save gate before final review");
  includes(gate, "form.requestSubmit(saveButton)", "existing draft save flow reuse");
  includes(gate, "previewButton.click()", "reader preview transition");
  includes(gate, "if (isPreviewForm(event.target))", "preview form remains the final publish path");
  assert.equal(
    gate.includes("form.requestSubmit(submitter)"),
    false,
    "direct writer publish must never bypass final reader preview",
  );
  includes(writer, 'back: "Düzenlemeye Dön"', "final review return action");
  includes(writer, 'title: "Okuyucu Önizlemesi"', "final review title");
  includes(writer, 'publish: "Yayını Onayla"', "explicit final publish confirmation");
});

test("successful publish offers a direct return to Eserlerim", () => {
  const enhancer = source(
    "src/features/writer/components/WriterPublishExperienceEnhancer.tsx",
  );
  const css = source("src/features/writer/writer-publish-experience.css");

  includes(enhancer, 'href="/eserlerim"', "Eserlerim destination");
  includes(enhancer, "Eserlerime Dön", "post-publish action label");
  includes(
    enhancer,
    'className="button button--primary writer-post-publish-action"',
    "post-publish action keeps the primary button treatment",
  );
  includes(css, ".writer-post-publish-action", "post-publish action replacement styling");
});

test("all writer flow entry routes mount the publish experience enhancer", () => {
  for (const path of [
    "src/app/yazar/layout.tsx",
    "src/app/eserlerim/layout.tsx",
    "src/app/yazmaya-devam/layout.tsx",
  ]) {
    const layout = source(path);
    includes(layout, "WriterPublishExperienceEnhancer", `${path} publish enhancer`);
    includes(layout, "writer-publish-experience.css", `${path} publish experience CSS`);
  }
});
