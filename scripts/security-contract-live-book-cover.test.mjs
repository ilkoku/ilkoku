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

test("every work uses its real cover and new readers enter through the cover", () => {
  const showcase = source(
    "src/features/showcase/components/BookShowcase.tsx",
  );

  includes(
    showcase,
    "coverUrl={work.coverUrl}",
    "real work cover binding",
  );
  includes(
    showcase,
    "`/oku/${work.slug}/kapak?from=${encodedBookContextPath}`",
    "generic cover-first route",
  );
  includes(
    showcase,
    "readingProgress && resumeChapter",
    "existing reader resume gate",
  );
  includes(
    showcase,
    '"Okumaya Devam Et" : "Okumaya Başla"',
    "resume versus first-read labels",
  );
});

test("front cover is an unnumbered live-book surface before the first published item", () => {
  const coverPage = source("src/app/oku/[slug]/kapak/page.tsx");
  const publication = source("src/features/works/book-publication.ts");

  includes(coverPage, 'data-book-surface="front-cover"', "front cover surface");
  includes(coverPage, "coverUrl={work.coverUrl}", "cover source");
  includes(coverPage, "publishedBookItemHref", "published book first item handoff");
  includes(
    coverPage,
    "Kapak kitap sayfa numarasına dahil değildir. İçerik sayfa 1’den başlar.",
    "body numbering contract",
  );
  includes(
    publication,
    "? `/oku/${workSlug}/bolum-${item.chapterPosition}`",
    "existing chapter deep link",
  );
  includes(
    publication,
    ': `/oku/${workSlug}/sayfa/${encodeURIComponent(item.structureItemId)}`',
    "existing special-page deep link",
  );
});

test("writer final review starts from the same unnumbered cover", () => {
  const prepare = source(
    "src/features/works/prepare-full-book-publication-action.ts",
  );
  const preview = source(
    "src/features/writer/components/WriterPublishExperienceEnhancer.tsx",
  );
  const store = source(
    "src/features/writer/writer-publication-preview-store.ts",
  );

  includes(prepare, "coverUrl: work.coverUrl", "writer cover metadata handoff");
  includes(store, "coverUrl: string | null", "transient preview cover metadata");
  includes(preview, 'const COVER_SURFACE_ID = "__front_cover__"', "cover-first preview state");
  includes(preview, 'data-book-surface="front-cover"', "writer cover surface");
  includes(preview, "bookPageStart={bookPageStart}", "body page numbering unchanged");
  includes(preview, "bookTotalPages={book.totalPages}", "body total pages unchanged");
});
