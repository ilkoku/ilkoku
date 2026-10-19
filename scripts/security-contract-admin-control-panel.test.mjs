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
  assert.match(shell, /setMenuSelection/);
  assert.match(shell, /admin-nav-group__toggle/);
  assert.match(shell, /Sistem yönetimi ana menüsü/);
  assert.match(shell, /admin-secondary-panel__items/);
  assert.match(shell, /admin-workspace/);
  assert.match(shell, /adminNavigationGroups\.map/);
  assert.doesNotMatch(shell.slice(shell.indexOf('<nav aria-label="Sistem yönetimi ana menüsü">'), shell.indexOf("</nav>")), /group\.items\.map|selectedGroup\.items\.map/, "left sidebar must not render submenus");

  assert.match(shell, /aria-expanded=\{isSelected\}/);
  assert.match(shell, /selectedGroup\.items\.map/);

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
  assert.ok(navigation.includes("module.showInNavigation !== false"), "unified CMS nav respects showInNavigation");
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
  assert.match(shell, /id="admin-secondary-panel"/);
  assert.match(shell, /setExpandedSubmenus/);

  assert.match(shell, /item\.children\?\.map/);
  assert.match(shell, /className="admin-secondary-panel"/);
});

test("admin removes only duplicated shortcuts while preserving Hesabım and Çıkış", () => {
  assert.doesNotMatch(shell, /href="\/icerik">\s*İçerik Yönetimi/);
  assert.doesNotMatch(dashboard, /Sistem hareketlerini aç/);
  assert.match(shell, /href="\/hesabim">Hesabım/);
  assert.match(shell, /<form action=\{logoutAction\}>/);
  assert.match(shell, /aria-label="Çıkış yap"/);
  assert.match(shell, /aria-label="Sistem hareketlerini görüntüle"/);
  assert.match(navigation, /href: "\/icerik", label: "İçerik Yönetimi"/);
  assert.match(navigation, /label: "Audit Log"/);
});

test("all four admin centers render one canonical left/right navigation shell", () => {
  const layouts = [
    "src/app/admin/layout.tsx",
    "src/app/icerik/layout.tsx",
    "src/app/harita/layout.tsx",
    "src/app/sozlesme/layout.tsx",
  ];
  for (const path of layouts) {
    assert.match(read(path), /<AdminShell/, path + " uses the one shared admin shell");
  }
  assert.match(read("src/app/icerik/layout.tsx"), /access\.isAdmin/, "CMS respects non-admin publisher roles");
  assert.match(read("src/app/icerik/layout.tsx"), /<ContentShell embedded/, "CMS keeps its own workspace without a second nav");
  assert.match(read("src/components/content/ContentShell.tsx"), /!embedded \? <aside/, "non-admin CMS sidebar stays accessible");
  assert.doesNotMatch(read("src/app/harita/layout.tsx"), /<SystemMapNavigation/, "map must not add a second left sidebar");
  assert.doesNotMatch(read("src/app/sozlesme/layout.tsx"), /<ContractManagementNavigation/, "contracts must not add a second left sidebar");
  for (const path of layouts.slice(1)) {
    assert.match(read(path), /\.\.\/admin\/admin\.css/, "all areas share same original admin navigation styling");
  }
  assert.match(read("src/components/admin/AdminShell.tsx"), /embeddedWorkspace/, "specialist page content is preserved without extra gutters");
});

test("unified admin preserves hidden CMS helpers and query-based Power-SEO active tabs", () => {
  const cms = read("src/lib/cms-modules.ts");
  assert.match(cms, /showInNavigation: false/);
  assert.match(navigation, /module\.showInNavigation !== false/);
  assert.match(shell, /useSearchParams\(\)/);
  assert.match(shell, /isActiveSubItem\(child\.href, item\.children/);
  assert.match(shell, /new URLSearchParams\(query\)/);
  assert.match(shell, /currentSearch\.get\("mod"\) \? "tarama"/, "nested scan modes remain under tarama");
  assert.match(shell, /currentSearch\.get\("yol"\) \? "sayfa"/, "legacy page deep links remain under sayfa");
});
