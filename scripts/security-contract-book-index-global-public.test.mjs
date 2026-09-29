import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");
const contains = (text, fragment, label) =>
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
const notContains = (text, fragment, label) =>
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);

test("global bestseller preview reads only the six approved native source lists", () => {
  const model = source("src/lib/book-index/global-public-read-model.ts");

  for (const listCode of [
    "amazon-us-live",
    "amazon-uk-live",
    "ibs-it-daily",
    "rakuten-jp-weekly",
    "kyobo-kr-weekly",
    "readings-au-monthly",
  ]) {
    contains(model, `"${listCode}"`, `${listCode} approved global list`);
  }

  contains(
    model,
    "getBookIndexSourceListSnapshot(listCode, limit)",
    "global preview reuses successful native snapshot reads",
  );
  contains(
    model,
    'rolloutState: "gated"',
    "global rollout remains explicitly gated",
  );
  contains(
    model,
    'BOOK_INDEX_GLOBAL_PREVIEW_ENABLED === "true"',
    "global preview requires an explicit environment switch",
  );
  notContains(
    model,
    "includeInComposite",
    "global preview does not build a cross-market composite rank",
  );
  notContains(
    model,
    "getTurkeySourceRankRows",
    "global preview stays independent from Turkey ranking aggregation",
  );
});


test("global bestseller page is gated, noindex and source-native", () => {
  const page = source("src/app/en-cok-satanlar/dunya/page.tsx");
  const view = source("src/features/book-index/public/GlobalBestsellerView.tsx");
  const sitemap = source("src/app/sitemap.ts");

  contains(
    page,
    "if (!isGlobalBestsellerPreviewEnabled()) notFound();",
    "global route remains behind explicit preview gate",
  );
  contains(page, "noIndex: true", "global preview stays noindex");
  contains(
    view,
    "İlkOku ülkeler arasında ortak bir dünya sırası",
    "global view explicitly rejects an invented world rank",
  );
  contains(
    view,
    "Sıra numaraları İlkOku tarafından yeniden",
    "source-native rank methodology",
  );
  contains(view, "item.rank", "native source rank rendering");
  notContains(
    sitemap,
    "/en-cok-satanlar/dunya",
    "global preview is absent from sitemap before SEO approval",
  );
});


test("global bestseller overview link appears only when preview gate is enabled", () => {
  const page = source("src/app/en-cok-satanlar/page.tsx");
  const view = source("src/features/book-index/public/BookIndexPublicView.tsx");

  contains(
    page,
    "const showGlobalPreview = isGlobalBestsellerPreviewEnabled();",
    "overview resolves global preview gate on the server",
  );
  contains(
    view,
    "showGlobalPreview ? (",
    "global overview link is conditionally rendered",
  );
  contains(
    view,
    'href="/en-cok-satanlar/dunya"',
    "approved global preview route",
  );
  contains(
    view,
    "<article className={styles.card}>",
    "disabled gate keeps the current non-link card fallback",
  );
});
