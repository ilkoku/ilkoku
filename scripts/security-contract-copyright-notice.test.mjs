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

test("copyright notice stays CMS-compatible, evidence-led and truthful about platform authority", () => {
  const content = source("src/content/copyright-notice.ts");
  const page = source("src/app/telif-bildirimi/page.tsx");
  const experience = source("src/components/content/CopyrightNoticeExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const cmsStore = source("src/lib/cms-public-page-store.ts");
  const sitemap = source("src/app/sitemap.ts");

  contains(content, "somut iddiayı kayıtlı bir süreç üzerinden iletmenizi sağlar", "structured reporting value");
  contains(content, "hukuki ağırlıkları olayın niteliğine göre değişebilir", "no fabricated ownership adjudication");
  contains(content, "acele hüküm vermek değil", "report-not-verdict boundary");
  contains(content, "platform dışındaki web siteleri veya üçüncü taraf kopyalar üzerinde doğrudan kontrol sahibi değildir", "platform authority boundary");
  contains(content, "yalnız gerekli bilgiyi gönderin", "privacy-minimization boundary");
  contains(content, "destek@ilkoku.com", "existing copyright contact channel");

  contains(page, 'getPublishedCmsPublicPageState("telif-bildirimi")', "CMS-owned copyright page");
  contains(page, "CopyrightNoticeExperience", "branded copyright experience");
  contains(page, '"@type": "BreadcrumbList"', "copyright breadcrumb schema");
  contains(experience, 'getPublicTrustPageVisual("/telif-bildirimi")', "prepared copyright visual");
  contains(experience, 'href="/yasal/telif-hakki-politikasi"', "copyright policy boundary");
  contains(experience, 'href="mailto:destek@ilkoku.com"', "existing support email action");
  contains(preview, 'page.contentKey === "page:tr:telif-bildirimi"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:telif-bildirimi"', "CMS starter draft");
  contains(starterContent, 'revalidatePath("/telif-bildirimi")', "copyright public revalidation");
  contains(cmsStore, '"telif-bildirimi": {', "legacy copyright CMS bridge");
  contains(sitemap, "${baseUrl}/telif-bildirimi", "copyright sitemap route");

  notContains(content, "DMCA", "unfounded foreign-law process label");
  notContains(content, "24 saat içinde", "fabricated takedown SLA");
  notContains(content, "otomatik olarak kaldır", "automatic takedown claim");
  notContains(content, "telif sahipliğini garanti eder", "fabricated ownership guarantee");
});
