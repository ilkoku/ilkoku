import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

function has(text, fragment, label) {
  assert.ok(text.includes(fragment), `${label} must contain ${JSON.stringify(fragment)}`);
}

function lacks(text, fragment, label) {
  assert.equal(text.includes(fragment), false, `${label} must not contain ${JSON.stringify(fragment)}`);
}

test("CMS access workbench stays admin-only and separate from product roles", () => {
  const page = source("src/app/icerik/erisim/page.tsx");
  const route = source("src/app/api/cms-access-manage/route.ts");

  has(page, 'requireCmsAdmin("/icerik/erisim")', "access page admin boundary");
  has(route, "!access.user || !access.isAdmin", "access mutation admin boundary");
  has(route, "isSameOriginRequest(request)", "access mutation same-origin boundary");
  has(route, "target.role === \"admin\"", "admin target exclusion");
  has(route, "ContentManagerAccess", "dedicated CMS access storage");
  lacks(route, "UPDATE User SET role", "product role mutation");
  lacks(route, "role = VALUES", "product role upsert");
});

test("CMS access workbench keeps publish privilege explicit and revocation fail-safe", () => {
  const page = source("src/app/icerik/erisim/page.tsx");
  const route = source("src/app/api/cms-access-manage/route.ts");

  has(page, "Yönetim + Yayın", "explicit publish profile");
  has(page, "Yalnız yönetim", "management-only profile");
  has(page, 'name="canPublish" value="on"', "explicit publish form signal");
  has(route, 'form.get("canPublish") === "on"', "server publish permission parsing");
  has(route, "canPublish = false", "revocation clears publish privilege");
  has(route, "active = false", "revocation disables CMS access");
});

test("CMS settings workbench preserves strict fail-closed configuration loading", () => {
  const page = source("src/app/icerik/ayarlar/page.tsx");
  const settings = source("src/lib/cms-settings.ts");
  const route = source("src/app/api/cms-settings/route.ts");

  has(page, "parseCmsSettingsStrict", "strict settings read parser");
  has(page, 'state: "read-error"', "settings read-error state");
  has(page, 'state: "invalid"', "settings invalid state");
  has(page, 'loaded.state !== "ready"', "settings fail-closed UI boundary");
  has(settings, "parseCmsSettingsStrict", "strict settings contract");
  has(route, 'user.role !== "admin"', "settings write admin boundary");
  has(route, "sameOrigin(request)", "settings write same-origin boundary");
});

test("CMS settings are presented as an impact-aware dirty-state workbench", () => {
  const workbench = source("src/components/content/CmsSettingsWorkbench.tsx");

  has(workbench, "Kaydedilmemiş ayar değişiklikleri var", "dirty-state status");
  has(workbench, "Riskli tercih", "risk summary");
  has(workbench, "Ayrı yayın yetkisi", "publish boundary decision card");
  has(workbench, "Revision saklama", "revision retention decision card");
  has(workbench, "Yeni sayfa indeksleme", "SEO indexing decision card");
  has(workbench, 'action="/api/cms-settings"', "canonical settings save route");
  lacks(workbench, "fetch(", "no shadow client persistence path");
});
