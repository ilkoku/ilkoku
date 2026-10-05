import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("education surfaces expose visible editorial transparency without removing live pages", () => {
  const note = source("src/components/content/EditorialTrustNote.tsx");
  const writing = source("src/components/content/WritingGuideShell.tsx");
  const reading = source("src/components/content/ReaderEducationPage.tsx");
  const editing = source("src/components/content/EditorEducationShell.tsx");

  assert.match(note, /Hazırlayan: İlkOku/u);
  assert.match(note, /Editoryal standartlar/u);
  assert.match(note, /İlkOku hakkında/u);
  assert.match(note, /Son sayfa güncellemesi: 6 Ekim 2026/u);
  assert.match(note, /profesyonel danışmanlığın yerine geçmez/u);

  assert.match(writing, /<EditorialTrustNote context="writing" \/>/u);
  assert.match(reading, /<EditorialTrustNote context="reading" \/>/u);
  assert.match(editing, /<EditorialTrustNote context="editing" \/>/u);
});
