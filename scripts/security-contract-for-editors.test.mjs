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

test("editor public page stays CMS-owned and truthful about assignment, independence and confidentiality", () => {
  const content = source("src/content/for-editors.ts");
  const page = source("src/app/editorler-icin/page.tsx");
  const experience = source("src/components/content/ForEditorsExperience.tsx");
  const preview = source("src/app/icerik/onizleme/sayfa/[id]/page.tsx");
  const starterContent = source("src/features/cms/starter-content-actions.ts");
  const sitemap = source("src/app/sitemap.ts");
  const requests = source("src/app/editor/talepler/page.tsx");
  const reviews = source("src/app/editor/incelemeler/page.tsx");
  const standards = source("src/content/editorial-standards.ts");

  contains(content, "aynı birinci inceleme başka bir editör tarafından eş zamanlı olarak üstlenilemez", "first editor assignment lock");
  contains(content, "İkinci editör birinci editörle aynı kişi olamaz", "second editor separation");
  contains(content, "birinci editörün raporuna erişmez", "second editor independence");
  contains(content, "yalnız görev amacıyla kullanılabilir", "editor confidentiality boundary");
  contains(content, "Çıkar çatışması bildirmek olumsuz bir sicil değildir", "conflict disclosure boundary");
  contains(content, "son söz yazarındır", "writer creative decision boundary");
  contains(content, "hukuki görüş veya başarı garantisi değildir", "editor authority boundary");

  contains(page, 'getPublishedCmsPublicPageState("editorler-icin")', "CMS-owned editor page");
  contains(page, "ForEditorsExperience", "branded editor experience");
  contains(page, '"@type": "BreadcrumbList"', "editor breadcrumb schema");
  contains(experience, 'getPublicTrustPageVisual("/editorler-icin")', "prepared editor visual");
  contains(experience, 'href="/kayit?rol=editor"', "editor registration CTA");
  contains(experience, 'href="/editoryal-standartlar"', "editor standards link");
  contains(preview, 'page.contentKey === "page:tr:editorler-icin"', "visual CMS preview boundary");
  contains(starterContent, 'contentKey: "page:tr:editorler-icin"', "CMS starter draft");
  contains(starterContent, 'revalidatePath("/editorler-icin")', "editor public revalidation");
  contains(sitemap, "${baseUrl}/editorler-icin", "editor sitemap route");

  contains(requests, "Bir görevi ilk alan editörün ataması güvenli biçimde kilitlenir", "real editor pool lock");
  contains(requests, "2. Editör Havuzu", "real second editor pool");
  contains(reviews, "bağımsız ikinci editör görevlerini yönetin", "real second editor workspace");
  contains(standards, "İkinci editör aynı kişi olamaz", "existing editorial independence standard");
  contains(standards, "Yayınlanmamış eser ya da kullanıcı verisi", "existing confidentiality standard");

  notContains(content, "yayınevi kabulünü garanti eder", "fabricated publisher guarantee");
  notContains(content, "eseri istediği gibi kullanabilir", "fabricated editor usage right");
  notContains(content, "ikinci editör ilk raporu görür", "broken independence claim");
});
