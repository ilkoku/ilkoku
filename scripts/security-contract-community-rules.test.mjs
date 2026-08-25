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

test("community rules stay CMS-owned, truthful and connected to safe public surfaces", () => {
  const content = source("src/content/community-rules.ts");
  const page = source("src/app/topluluk-kurallari/page.tsx");
  const experience = source("src/components/content/CommunityRulesExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const sitemap = source("src/app/sitemap.ts");

  contains(content, "Bir görüşe, esere veya değerlendirmeye katılmamak mümkündür", "disagreement boundary");
  contains(content, "kişiyi küçültmek, tehdit etmek veya topluca hedef göstermek kabul edilmez", "personal-attack boundary");
  contains(content, "Bildirim otomatik suçluluk kararı değildir", "report-not-verdict boundary");
  contains(content, "bütün kullanıcı içeriklerini yayınlanmadan önce insan eliyle incelemeyi", "no fabricated pre-moderation");
  contains(content, "otomatik sistemlerin her ihlali tespit edeceğini taahhüt etmez", "no fabricated detection guarantee");
  contains(content, "mümkün olan en az bilgi", "privacy-minimization boundary");

  contains(page, 'getPublishedCmsPublicPageState("topluluk-kurallari")', "CMS-owned community page");
  contains(page, "CommunityRulesExperience", "branded community experience");
  contains(page, '"@type": "BreadcrumbList"', "community breadcrumb schema");
  contains(experience, 'getPublicTrustPageVisual("/topluluk-kurallari")', "prepared community visual");
  contains(experience, 'href="/yasal/telif-hakki-politikasi"', "deployment-safe copyright link");
  notContains(experience, 'href="/telif-bildirimi"', "future copyright route before launch");
  contains(preview, 'page.contentKey === "page:tr:topluluk-kurallari"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:topluluk-kurallari"', "CMS starter draft");
  contains(starterContent, 'revalidatePath("/topluluk-kurallari")', "community public revalidation");
  contains(sitemap, "${baseUrl}/topluluk-kurallari", "community sitemap route");
});
