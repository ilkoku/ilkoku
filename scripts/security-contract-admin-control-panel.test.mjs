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

test("dashboard keeps real metrics but avoids duplicating the permanent management menu", () => {
  assert.doesNotMatch(dashboard, /managementCenters|admin-control-centers|Nereye gitmek istiyorsun\?/);
  assert.match(dashboard, /Anlık platform özeti/);
  assert.match(dashboard, /newUsersToday/);
  assert.match(dashboard, /latestActivity/);
  assert.match(shell, /adminNavigationGroups\.map/);
  assert.match(shell, /selectedGroup\.items\.map/);
  assert.match(shell, /href="\/hesabim">Hesabım/);
  assert.match(shell, /aria-label="Çıkış yap"/);
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

test("user directory names and e-mails wrap on separate, slightly smaller lines", () => {
  const css = read("src/app/admin/users.css");
  const userTable = read("src/components/admin/UserManagement.tsx");
  assert.match(css, /\.admin-users-table tbody td:nth-child\(2\) > strong/);
  assert.match(css, /\.admin-users-table tbody td:nth-child\(2\) > span/);
  assert.match(css, /font-size: 0\.76rem;/);
  assert.match(css, /font-size: 0\.68rem;/);
  assert.match(css, /overflow-wrap: anywhere;/);
  assert.match(userTable, /<strong>\{user\.fullName\}<\/strong>/);
  assert.match(userTable, /<span>\{user\.email\}<\/span>/);
  assert.match(shell, /href="\/hesabim">Hesabım/);
  assert.match(shell, /<form action=\{logoutAction\}>/);
});

test("horizontal admin navigation keeps visible borders and active-tab cues", () => {
  const css = read("src/app/admin/admin.css");
  const panel = css.slice(css.indexOf("/* Unified navigation:"));
  assert.match(panel, /border-top: 1px solid rgba\(148,163,184,\.24\)/);
  assert.match(panel, /border-bottom: 1px solid rgba\(148,163,184,\.32\)/);
  assert.match(panel, /border-bottom: 1px solid rgba\(148,163,184,\.25\)/);
  assert.match(panel, /border: 1px solid rgba\(148,163,184,\.25\)/);
  assert.match(panel, /border-color: rgba\(167,139,250,\.75\)/);
  assert.match(panel, /box-shadow: inset 0 -3px #a78bfa/);
  assert.match(panel, /border-left: 1px solid rgba\(148,163,184,\.3\)/);
  assert.match(panel, /\.admin-secondary-panel a:focus-visible/);
  assert.match(shell, /href="\/hesabim">Hesabım/);
  assert.match(shell, /<form action=\{logoutAction\}>/);
});

test("unified admin displays horizontal second and third-level navigation above page content", () => {
  const css = read("src/app/admin/admin.css");
  assert.match(css, /\.admin-workspace\.has-menu\s*\{\s*display: flex;/);
  assert.match(css, /\.admin-secondary-panel__items,[\s\S]*?display: flex;/);
  assert.match(css, /flex-wrap: nowrap;/);
  assert.match(css, /\.admin-secondary-panel \.admin-tertiary-row/);
  assert.match(shell, /className="admin-tertiary-row admin-nav-child__items"/);
  assert.match(shell, /selectedGroup\.items\.map/);
  assert.match(shell, /href="\/hesabim">Hesabım/);
  assert.match(shell, /<form action=\{logoutAction\}>/);
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
  assert.match(shell, /className="admin-tertiary-row admin-nav-child__items"/);
  assert.match(shell, /aria-expanded=\{subExpanded\}/);
  assert.match(shell, /aria-controls=\{/);
  assert.match(shell, /id="admin-secondary-panel"/);
  assert.match(shell, /setExpandedSubmenus/);

  assert.match(shell, /item\.children\.map/);
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
