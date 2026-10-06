import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("flagship writing guides expose distinct search-intent and output panels", () => {
  const panel = source("src/components/content/PriorityGuideIntentPanel.tsx");
  const shell = source("src/components/content/WritingGuideShell.tsx");

  for (const slug of ["roman", "oyku", "fantastik", "bilim-kurgu", "distopya", "siir"]) {
    assert.ok(panel.includes(`${slug}:`) || panel.includes(`"${slug}":`), `missing flagship intent for ${slug}`);
  }

  for (const phrase of [
    "Roman nasıl yazılır ve uzun bir hikâye dağılmadan nasıl planlanır?",
    "Kısa öykü nasıl yazılır ve az sayfada güçlü etki nasıl kurulur?",
    "Fantastik kurgu nasıl yazılır ve dünya kurma hikâyeyi boğmadan nasıl yapılır?",
    "Bilim kurgu nasıl yazılır ve bilimsel fikir hikâyeye nasıl dönüştürülür?",
    "Distopya nasıl yazılır ve baskıcı sistem inandırıcı biçimde nasıl kurulur?",
    "Şiir nasıl yazılır ve duygu açıklamadan nasıl hissettirilir?",
  ]) {
    assert.ok(panel.includes(phrase), `missing distinct search intent: ${phrase}`);
  }

  assert.ok(panel.includes("Bu rehberden çıkarken"));
  assert.ok(shell.includes("<PriorityGuideIntentPanel slug={activeGenreSlug} />"));
});
