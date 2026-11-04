import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("education surfaces expose visible editorial methodology without removing live pages", () => {
  const note = source("src/components/content/EditorialTrustNote.tsx");
  const writing = source("src/components/content/WritingGuideShell.tsx");
  const reading = source("src/components/content/ReaderEducationPage.tsx");
  const editing = source("src/components/content/EditorEducationShell.tsx");

  assert.match(note, /Hazırlayan: İlkOku/u);
  assert.match(note, /Editoryal standartlar/u);
  assert.match(note, /İlkOku hakkında/u);
  assert.doesNotMatch(note, /Son sayfa güncellemesi:/u);
  assert.match(note, /İçerik yöntemi/u);
  assert.match(note, /Editoryal kontrol/u);
  assert.match(note, /Kaynak yaklaşımı/u);
  assert.match(note, /İlkOku’ya özgü uygulama/u);
  assert.match(note, /Uzmanlık gerektiren konu/u);
  assert.match(note, /uzman görüşünün ve güncel yetkili kaynakların yerine geçmez/u);

  assert.match(writing, /expertVerificationRequired\?: boolean/u);
  assert.match(writing, /authoritativeSources={authoritativeSources}/u);
  assert.match(writing, /expertVerificationRequired={expertVerificationRequired}/u);
  assert.match(reading, /<EditorialTrustNote context="reading" \/>/u);
  assert.match(editing, /<EditorialTrustNote context="editing" \/>/u);
});

test("sensitive informational writing guides expose the expert-verification layer", () => {
  const education = source("src/components/content/BatchedEducationGuidePage.tsx");
  const sources = source("src/lib/authoritative-guide-sources.ts");
  const note = source("src/components/content/EditorialTrustNote.tsx");

  for (const slug of ["psikoloji", "finans", "hukuk", "saglik"]) {
    assert.match(education, new RegExp(`"${slug}"`, "u"));
  }
  assert.match(education, /EXPERT_VERIFICATION_GUIDE_SLUGS\.has\(definition\.slug\)/u);
  assert.match(education, /expertVerificationRequired={expertVerificationRequired}/u);
  assert.match(education, /citation: authoritativeSources\.map/u);
  assert.match(note, /Yetkili ve birincil kaynaklar/u);
  assert.match(note, /authoritativeSources\.map/u);
  for (const hostname of [
    "who.int",
    "icd.who.int",
    "spk.gov.tr",
    "evds3.tcmb.gov.tr",
    "mevzuat.gov.tr",
    "resmigazete.gov.tr",
    "sggm.saglik.gov.tr",
  ]) {
    assert.match(sources, new RegExp(hostname.replaceAll(".", "\\."), "u"));
  }
});