import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("public SEO shell stays cacheable and session-neutral", () => {
  const homepage = read("src/app/page.tsx");
  const experience = read("src/app/onizleme/ana-sayfa-yeni/HomepageExperience.tsx");
  const header = read("src/components/layout/PublicSiteHeader.tsx");
  const footer = read("src/components/content/PublicTrustFooter.tsx");

  assert.match(homepage, /export const revalidate = 300;/u);
  assert.doesNotMatch(homepage, /force-dynamic/u);
  for (const source of [experience, header, footer]) {
    assert.doesNotMatch(source, /getCurrentProfile/u);
    assert.doesNotMatch(source, /getRoleNavigation/u);
  }
});
