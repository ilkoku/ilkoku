import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function assertContains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

test("reader education keeps eight categories and six optional CMS visual slots", () => {
  const inventory = source("src/lib/reader-education.ts");
  const publicRoute = source("src/app/okurlar-icin/[slug]/page.tsx");
  const renderer = source("src/components/content/ReaderEducationPage.tsx");
  const gateway = source("src/components/content/ReaderEducationGateway.tsx");
  const howItWorks = source("src/components/content/HowItWorksExperience.tsx");
  const dashboard = source("src/app/icerik/egitim/page.tsx");
  const editor = source("src/app/icerik/egitim/okur/[slug]/page.tsx");
  const upload = source("src/app/api/cms-reader-education-media-upload/route.ts");

  const categorySlugs = [...inventory.matchAll(/\n    slug: "([^"]+)",\n    number: "0[1-8]",/g)].map((match) => match[1]);
  assert.equal(categorySlugs.length, 8, "reader education inventory must stay at 8 main categories");
  assert.equal(new Set(categorySlugs).size, 8, "reader education category slugs must be unique");

  for (const slot of ["hero", "learningPath", "analysis", "example", "practice", "finalCta"]) {
    assertContains(inventory, `key: "${slot}"`, `reader visual slot ${slot}`);
    assertContains(renderer, `slotKey="${slot}"`, `reader renderer slot ${slot}`);
  }

  assertContains(publicRoute, "robots: { index: true, follow: true }", "reader education index/follow");
  assertContains(publicRoute, "readerEducationPublicPath(category)", "reader education self canonical source");
  assertContains(publicRoute, "notFound()", "invalid reader education slug 404");

  assertContains(howItWorks, 'import { ReaderEducationGateway } from "@/components/content/ReaderEducationGateway"', "how it works reader gateway import");
  assertContains(howItWorks, "<ReaderEducationGateway />", "how it works reader gateway placement");
  assertContains(gateway, "READER_EDUCATION_CATEGORIES.map", "eight-card gateway generation");
  assertContains(gateway, "Okuma eğitimini kendi yolundan keşfet.", "reader education gateway heading");
  assertContains(gateway, 'className="how-related__grid"', "existing four platform cards remain below education cards");

  assertContains(dashboard, "Okurluk Okulu", "CMS reader education section");
  assertContains(dashboard, "48 slot", "CMS future visual slot total");
  assertContains(editor, "6 gelecekteki görsel slotu", "reader CMS six-slot editor");
  assertContains(editor, "Canlı sayfada bu slot boşluk oluşturmaz.", "reader empty visual no-gap contract");
  assertContains(upload, "isSameOriginRequest(request)", "reader upload same-origin guard");
  assertContains(upload, "access.canManage", "reader upload CMS authorization guard");
  assertContains(upload, "MAX_CMS_MEDIA_BYTES", "reader upload media size guard");
});
