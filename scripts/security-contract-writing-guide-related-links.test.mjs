import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function genreSlugs() {
  return [...source("src/lib/genres.ts").matchAll(/\{ slug: "([^"]+)", label: "[^"]+", category: "[^"]+" \}/gu)].map((match) => match[1]);
}

function relatedGuideMap() {
  return Object.fromEntries(
    [...source("src/lib/writing-guide-related-links.ts").matchAll(/"([^"]+)": \["([^"]+)", "([^"]+)", "([^"]+)"\],/gu)]
      .map(([, slug, ...related]) => [slug, related]),
  );
}

test("all 85 writing guides have three valid, distinct semantic related-guide links", () => {
  const slugs = genreSlugs();
  const validSlugs = new Set(slugs);
  const related = relatedGuideMap();

  assert.equal(slugs.length, 85, "public writing guide inventory");
  assert.deepEqual(Object.keys(related).sort(), [...slugs].sort(), "every live guide has an explicit relationship set");

  for (const slug of slugs) {
    const targets = related[slug];
    assert.equal(targets.length, 3, `${slug} exposes three related guides`);
    assert.equal(new Set(targets).size, 3, `${slug} does not repeat a target`);
    assert.ok(!targets.includes(slug), `${slug} does not link to itself`);
    for (const target of targets) assert.ok(validSlugs.has(target), `${slug} targets live guide ${target}`);
  }
});

test("related-guide targets are distributed without the former priority-cohort concentration", () => {
  const related = relatedGuideMap();
  const inbound = new Map(genreSlugs().map((slug) => [slug, 0]));
  for (const targets of Object.values(related)) {
    for (const target of targets) inbound.set(target, (inbound.get(target) ?? 0) + 1);
  }

  const counts = [...inbound.values()];
  assert.equal(Math.min(...counts), 1, "every guide receives at least one contextual handoff");
  assert.ok(Math.max(...counts) <= 7, "no guide receives a disproportionate number of handoffs");

  for (const slug of ["roman", "oyku", "fantastik", "bilim-kurgu", "distopya", "siir"]) {
    assert.ok((inbound.get(slug) ?? 0) <= 7, `${slug} is not elevated by the old search-priority cohort`);
  }
});

test("semantic relationships retain representative form and subject-area connections", () => {
  const related = relatedGuideMap();
  const expected = {
    polisiye: ["dedektif", "gerilim", "casusluk"],
    "bilim-kurgu": ["fantastik", "distopya", "post-apokaliptik"],
    finans: ["ekonomi", "is-dunyasi", "girisimcilik"],
    "film-senaryosu": ["dizi-senaryosu", "kisa-film-senaryosu", "belgesel-senaryosu"],
    masal: ["fabl", "cocuk-hikayesi", "egitici-cocuk-kitabi"],
    "cizgi-roman": ["grafik-roman", "manga", "karikatur"],
  };
  for (const [slug, targets] of Object.entries(expected)) assert.deepEqual(related[slug], targets, `${slug} semantic relationship set`);

  const shell = source("src/components/content/WritingGuideShell.tsx");
  assert.match(shell, /getRelatedWritingGuideSlugs\(activeGenreSlug\)/u);
  assert.doesNotMatch(shell, /isSoftLaunchSearchPriorityPath/u);
});
