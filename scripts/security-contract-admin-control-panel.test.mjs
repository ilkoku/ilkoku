import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const navigation = read("src/lib/admin-navigation.ts");
const shell = read("src/components/admin/AdminShell.tsx");
const dashboard = read("src/components/admin/AdminDashboard.tsx");
const returnLink = read("src/components/admin/AdminReturnLink.tsx");
const contentCenter = read("src/app/icerik/page.tsx");
const systemMap = read("src/features/system-map/SystemMapWorkspacePage.tsx");
const contracts = read("src/app/sozlesme/page.tsx");

test("system management keeps every admin destination behind seven grouped navigation areas", () => {
  for (const label of [
    "Genel Bakış",
    "Kullanıcı & Roller",
    "Eser & İçerik",
    "Ticaret & Finans",
    "İletişim & Sözleşmeler",
    "Güvenlik & Sistem",
    "Arşiv & Ayarlar",
  ]) {
    assert.ok(navigation.includes(`label: "${label}"`), `${label} group must remain visible`);
  }

  for (const destination of [
    "/kullanicilar",
    "/yazarlar",
    "/editorler",
    "/yayinevleri",
    "/okuyucular",
    "/basvurular",
    "/roller",
    "/yorumlar",
    "/eserler",
    "/kitap-endeksi",
    "/odeme-sistemi",
    "/finans-gelirler",
    "/epostalar",
    "/eposta-operasyonlari",
    "/okuma-guvenligi",
    "/audit-log",
    "/arsiv",
    "/silme-merkezi",
    "/demo",
    "/ayarlar",
  ]) {
    assert.ok(navigation.includes(destination), `${destination} must remain reachable from grouped navigation`);
  }

  for (const externalCenter of ["/icerik", "/sozlesme", "/harita"]) {
    assert.ok(navigation.includes(`href: "${externalCenter}"`), `${externalCenter} must remain linked from system management`);
  }

  assert.match(shell, /adminNavigationGroups\.map/);
  assert.match(shell, /admin-nav-group__landing/);
  assert.match(shell, /href=\{group\.landingHref\}/);
  assert.match(shell, /admin-nav-group__toggle/);
  assert.match(shell, /aria-expanded=\{expanded\}/);
  assert.match(shell, /group\.items\.map/);

  for (const landing of [
    'landingHref: systemPath()',
    'landingHref: systemPath("/kullanicilar")',
    'landingHref: systemPath("/eserler")',
    'landingHref: systemPath("/odeme-sistemi")',
    'landingHref: "/sozlesme"',
    'landingHref: "/harita"',
    'landingHref: systemPath("/arsiv")',
  ]) {
    assert.ok(navigation.includes(landing), `${landing} must remain a real group landing route`);
  }
});

test("general admin dashboard exposes the six operational control centers before detail metrics", () => {
  for (const title of [
    "Kullanıcı & Roller",
    "Eser & İçerik",
    "Ticaret & Finans",
    "İletişim & Sözleşmeler",
    "Güvenlik & Sistem",
    "Arşiv & Ayarlar",
  ]) {
    assert.ok(dashboard.includes(`title: "${title}"`), `${title} dashboard center must remain available`);
  }

  assert.match(dashboard, /Nereye gitmek istiyorsun\?/);
  assert.match(dashboard, /managementCenters\.map/);
  assert.match(dashboard, /admin-control-centers__grid/);
});


test("admin subpages and external management centers expose a consistent return path", () => {
  assert.match(returnLink, /href="\/sistem-yonetimi"/);
  assert.match(returnLink, /Genel Yönetim Paneline Dön/);
  assert.match(shell, /pathname !== SYSTEM_MANAGEMENT_PATH/);
  assert.match(shell, /<AdminReturnLink \/>/);

  for (const source of [contentCenter, systemMap, contracts]) {
    assert.match(source, /<AdminReturnLink \/>/);
  }
});

test("third-level admin navigation preserves 7 groups and all 25 existing destinations", () => {
  assert.match(navigation, /children\?: readonly AdminNavSubItem\[\]/);
  assert.match(navigation, /cmsModules\.filter\(\(module\) => module\.enabled\)/);
  assert.match(navigation, /systemMapNavigationItems\.map/);
  for (const key of [
    "contentSubNavigation", "paymentSubNavigation", "financeSubNavigation",
    "contractSubNavigation", "powerSeoSubNavigation", "systemMapSubNavigation",
  ]) {
    assert.ok(navigation.includes(`children: ${key}`), `${key} is attached to the second-level item`);
  }
  for (const route of [
    "/odeme-sistemi/siparisler", "/odeme-sistemi/odemeler",
    "/odeme-sistemi/iadeler", "/odeme-sistemi/erisim-haklari",
    "/odeme-sistemi/kuponlar", "/odeme-sistemi/saglayicilar",
    "/odeme-sistemi/ayarlar", "/finans-gelirler/finans-hareketleri",
    "/finans-gelirler/ilkoku-gelirleri", "/finans-gelirler/kampanya-maliyetleri",
    "/finans-gelirler/mutabakat", "/finans-gelirler/yazar-bakiyeleri",
    "/finans-gelirler/yazar-hakedisleri", "/finans-gelirler/yazar-odemeleri",
    "/sozlesme/sablonlar/yeni", "/sozlesme/hukuk-inceleme",
    "/sozlesme/takip", "/icerik/rehber",
  ]) {
    assert.ok(navigation.includes(route), `${route} remains discoverable`);
  }
  for (const tab of ["tarama", "sayfa", "servisler", "teknik"]) {
    assert.ok(navigation.includes(`sekme=${tab}`), `Power-SEO ${tab} tab is linked`);
  }
  assert.match(shell, /expandedSubmenus/);
  assert.match(shell, /className="admin-nav-child__header"/);
  assert.match(shell, /className="admin-nav-child__items"/);
  assert.match(shell, /aria-expanded=\{subExpanded\}/);
  assert.match(shell, /aria-controls=\{/);
  assert.match(shell, /item\.children\?\.map/);
  assert.match(shell, /onClick=\{\(\) => setOpen\(false\)\}/);
});
