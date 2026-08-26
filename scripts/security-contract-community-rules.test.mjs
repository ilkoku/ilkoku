import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function contains(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function notContains(text, fragment, label) {
  assert.ok(!text.includes(fragment), `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("community rules stay CMS-compatible, constructive and connected to safe public surfaces", () => {
  const content = source("src/content/community-rules.ts");
  const page = source("src/app/topluluk-kurallari/page.tsx");
  const experience = source("src/components/content/CommunityRulesExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const cmsStore = source("src/lib/cms-public-page-store.ts");
  const sitemap = source("src/app/sitemap.ts");

  contains(content, "İlkOku'nun değeri yalnız eserlerin yayımlanmasından değil, eserlerin etrafında oluşan gerçek etkileşimden gelir", "community value proposition");
  contains(content, "eleştiri kişiye değil metne, davranışa veya somut iş sonucuna yönelir", "constructive disagreement boundary");
  contains(content, "Hakaret, tehdit, ısrarlı rahatsız etme", "personal-attack boundary");
  contains(content, "Keşif ancak sinyaller gerçek olduğunda anlamlıdır", "authentic discovery signal boundary");
  contains(content, "yalnız gerekli bilgi paylaşılmalıdır", "privacy-minimization boundary");
  contains(content, "Amaç otomatik ceza üretmek değil", "contextual moderation boundary");

  contains(page, 'getPublishedCmsPublicPageState("topluluk-kurallari")', "CMS-owned community page");
  contains(page, "CommunityRulesExperience", "branded community experience");
  contains(page, '"@type": "BreadcrumbList"', "community breadcrumb schema");
  contains(experience, 'getPublicTrustPageVisual("/topluluk-kurallari")', "prepared community visual");
  contains(experience, 'href="/telif-bildirimi"', "launched copyright notice link");
  notContains(experience, 'href="/yasal/telif-hakki-politikasi">Telif Hakkı Politikası →', "superseded direct policy CTA");
  contains(preview, 'page.contentKey === "page:tr:topluluk-kurallari"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:topluluk-kurallari"', "CMS starter draft");
  contains(starterContent, 'revalidatePath("/topluluk-kurallari")', "community public revalidation");
  contains(cmsStore, '"topluluk-kurallari": {', "legacy community CMS bridge");
  contains(sitemap, "${baseUrl}/topluluk-kurallari", "community sitemap route");

  notContains(content, "her ihlali otomatik tespit eder", "fabricated detection guarantee");
  notContains(content, "her içeriği yayın öncesi insan eliyle inceler", "fabricated pre-moderation guarantee");
});
