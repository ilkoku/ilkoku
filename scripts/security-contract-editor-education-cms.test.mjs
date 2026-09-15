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

test("editor education is a real content-management surface without weakening the approved public lessons", () => {
  const modules = source("src/lib/cms-modules.ts");
  const dashboard = source("src/app/icerik/editor-egitim/page.tsx");
  const detail = source("src/app/icerik/editor-egitim/[slug]/page.tsx");
  const cmsStore = source("src/lib/cms-editor-education.ts");
  const uploadApi = source("src/app/api/cms-editor-education-media-upload/route.ts");
  const shell = source("src/components/content/EditorEducationShell.tsx");
  const writerEducation = source("src/app/icerik/egitim/page.tsx");
  const readerEducation = source("src/app/icerik/okur-egitim/page.tsx");
  const inventory = source("src/lib/editor-education.ts");

  contains(modules, 'href: "/icerik/editor-egitim"', "CMS module route");
  contains(modules, 'label: "Editör Eğitim Merkezi"', "CMS module label");
  contains(modules, 'mode: "controlled-write"', "CMS module managed-write mode");

  contains(dashboard, "listEditorEducationGuideRecords", "editor education CMS inventory loader");
  contains(dashboard, "EDITOR_EDUCATION_CATEGORIES.length", "editor education eight-item inventory");
  contains(dashboard, 'lockedCategory="Editörlük Okulu"', "editor education locked workbench");
  contains(dashboard, "visualTarget={1}", "editor education cover target");
  contains(dashboard, 'publicHref: editorEducationPublicPath(category)', "editor education live links");

  contains(detail, "requireCmsManager", "editor education detail access gate");
  contains(detail, "Onaylı eğitim içeriği", "approved lesson body boundary");
  contains(detail, "Metin gövdesi canlı eğitim sayfasında kod kontrollüdür", "approved body remains code-controlled");
  contains(detail, "EditorEducationVisualUploadForm", "managed editor education upload form");
  contains(detail, 'target="_blank">Canlı sayfa', "editor education live preview link");

  contains(cmsStore, 'EDITOR_EDUCATION_GUIDE_NAMESPACE = "editor_education_guide"', "editor education SiteContent namespace");
  contains(cmsStore, "FROM SiteContent", "editor education SiteContent reads");
  contains(cmsStore, "EDITOR_EDUCATION_CATEGORIES.map", "editor education records include all categories");
  contains(cmsStore, "editorEducationGuideDefault", "editor education safe no-record fallback");

  contains(uploadApi, "isSameOriginRequest(request)", "editor education upload same-origin guard");
  contains(uploadApi, "getCmsAccess()", "editor education upload CMS auth");
  contains(uploadApi, "if (!access.canManage)", "editor education upload manager authorization");
  contains(uploadApi, 'collection: "editor-education"', "editor education media collection");
  contains(uploadApi, "'media_blob'", "editor education original media storage");
  contains(uploadApi, "EDITOR_EDUCATION_GUIDE_NAMESPACE", "editor education guide upsert");

  contains(shell, "getEditorEducationGuideRecord(activeCategory.slug)", "public lesson consumes managed editor education record");
  contains(shell, "guide?.visuals.cover", "public lesson managed cover binding");
  contains(shell, ".catch(() => null)", "public lesson fails open when CMS read is temporarily unavailable");
  contains(shell, "<Image", "public lesson renders managed cover when available");
  contains(shell, "<LiveHomepageFooter", "original public footer remains");
  notContains(shell, "PublicSiteHeader", "public header remains owned by PublicSiteFrame");

  contains(writerEducation, 'href="/icerik/editor-egitim"', "writer education links editor education CMS");
  contains(readerEducation, 'href="/icerik/editor-egitim"', "reader education links editor education CMS");

  assert.equal((inventory.match(/live: true/g) ?? []).length, 8, "all eight editor lessons remain live");
  contains(inventory, 'key: "cover"', "single managed cover visual slot");
  contains(inventory, 'aspectRatio: "3:2"', "managed cover aspect ratio contract");
});
