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

test("editor education CMS manages media and lesson text through a safe draft-preview-publish workflow", () => {
  const modules = source("src/lib/cms-modules.ts");
  const dashboard = source("src/app/icerik/editor-egitim/page.tsx");
  const detail = source("src/app/icerik/editor-egitim/[slug]/page.tsx");
  const preview = source("src/app/icerik/onizleme/editor-egitim/[slug]/page.tsx");
  const actions = source("src/features/cms/editor-education-actions.ts");
  const cmsStore = source("src/lib/cms-editor-education.ts");
  const textEngine = source("src/lib/editor-education-text.tsx");
  const sourceLoader = source("src/lib/editor-education-source.tsx");
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
  contains(detail, "Taslak → Önizleme → Yayınla", "editor education safe text workflow");
  contains(detail, "collectEditorEducationTextFields", "editor education source text inventory");
  contains(detail, "saveEditorEducationTextAction", "editor education text save action");
  contains(detail, "restoreEditorEducationTextRevisionAction", "editor education safe restore action");
  contains(detail, "Taslağı Kaydet", "editor education draft save control");
  contains(detail, "Taslak Önizleme", "editor education draft preview control");
  contains(detail, 'value="publish">Yayınla', "editor education explicit publish control");
  contains(detail, "EditorEducationVisualUploadForm", "managed editor education upload form");
  contains(detail, 'target="_blank">Canlı sayfa', "editor education live page link");
  contains(detail, "canonical ve Google index ayarları kod kontrollü kalır", "SEO boundary remains explicit");

  contains(preview, "requireCmsManager", "draft preview CMS access gate");
  contains(preview, "getEditorEducationDraftTextRecord", "draft preview reads draft first");
  contains(preview, "previewMode: true", "draft preview is visibly separated from live");
  contains(preview, "robots: { index: false, follow: false }", "draft preview is never indexable");

  contains(actions, "requireCmsPublisher", "publishing requires publisher permission");
  contains(actions, 'mode === "publish"', "draft and publish are distinct modes");
  contains(actions, "EDITOR_EDUCATION_TEXT_DRAFT_NAMESPACE", "draft writes are separate from live writes");
  contains(actions, "EDITOR_EDUCATION_TEXT_REVISION_NAMESPACE", "published versions create revision history");
  contains(actions, "DELETE FROM SiteContent", "publish or discard cleans working draft");
  contains(actions, "restoreEditorEducationTextRevisionAction", "revision restore returns to a draft");
  contains(actions, "refreshEditorEducation", "editor text changes revalidate managed routes");

  contains(cmsStore, 'EDITOR_EDUCATION_GUIDE_NAMESPACE = "editor_education_guide"', "editor education media SiteContent namespace");
  contains(cmsStore, 'EDITOR_EDUCATION_TEXT_NAMESPACE = "editor_education_text"', "published editor education text namespace");
  contains(cmsStore, 'EDITOR_EDUCATION_TEXT_DRAFT_NAMESPACE = "editor_education_text_draft"', "draft editor education text namespace");
  contains(cmsStore, 'EDITOR_EDUCATION_TEXT_REVISION_NAMESPACE = "editor_education_text_revision"', "editor education revision namespace");
  contains(cmsStore, "getEditorEducationPublishedTextRecord", "public text reader");
  contains(cmsStore, "getEditorEducationDraftTextRecord", "draft text reader");
  contains(cmsStore, "listEditorEducationTextRevisions", "revision history reader");
  contains(cmsStore, "editorEducationTextDefault", "editor education text no-record fallback");

  contains(textEngine, "collectEditorEducationTextFields", "source lesson text is discoverable without duplicating approved copy");
  contains(textEngine, "applyEditorEducationTextOverrides", "published overrides preserve the existing React layout");
  contains(textEngine, "cloneElement", "text overrides preserve lesson element structure");
  contains(sourceLoader, '"editorluge-baslama"', "source loader includes first lesson");
  contains(sourceLoader, '"yayincilik-ve-profesyonel-editorluk"', "source loader includes eighth lesson");

  contains(uploadApi, "isSameOriginRequest(request)", "editor education upload same-origin guard");
  contains(uploadApi, "getCmsAccess()", "editor education upload CMS auth");
  contains(uploadApi, "if (!access.canManage)", "editor education upload manager authorization");
  contains(uploadApi, 'collection: "editor-education"', "editor education media collection");
  contains(uploadApi, "'media_blob'", "editor education original media storage");
  contains(uploadApi, "EDITOR_EDUCATION_GUIDE_NAMESPACE", "editor education guide upsert");

  contains(shell, "getEditorEducationPublishedTextRecord(activeCategory.slug)", "public lesson consumes only published text overrides");
  contains(shell, "applyEditorEducationTextOverrides", "public lesson applies managed text in-place");
  contains(shell, "typeof textOverrides === \"undefined\"", "explicit draft preview does not fall through to published text");
  contains(shell, "getEditorEducationGuideRecord(activeCategory.slug)", "public lesson consumes managed editor education media record");
  contains(shell, "guide?.visuals.cover", "public lesson managed cover binding");
  contains(shell, ".catch(() => null)", "public lesson fails open when CMS reads are temporarily unavailable");
  contains(shell, "<LiveHomepageFooter", "original public footer remains");
  notContains(shell, "PublicSiteHeader", "public header remains owned by PublicSiteFrame");

  contains(writerEducation, 'href="/icerik/editor-egitim"', "writer education links editor education CMS");
  contains(readerEducation, 'href="/icerik/editor-egitim"', "reader education links editor education CMS");

  assert.equal((inventory.match(/live: true/g) ?? []).length, 8, "all eight editor lessons remain live");
  contains(inventory, 'key: "cover"', "single managed cover visual slot");
  contains(inventory, 'aspectRatio: "3:2"', "managed cover aspect ratio contract");
});
