import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const navigation = read("src/lib/admin-navigation.ts");
const shell = read("src/components/admin/AdminShell.tsx");
const dashboard = read("src/components/admin/AdminDashboard.tsx");

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
  assert.match(shell, /className="admin-nav-group"/);
  assert.match(shell, /const navigationPathname = pathname\.replace\(/);
  assert.match(shell, /\^\\\/admin\(\?=\\\/\|\$\)/);
  assert.match(shell, /SYSTEM_MANAGEMENT_PATH/);
  assert.match(shell, /navigationPathname === item\.href/);
  assert.match(shell, /navigationPathname\.startsWith\(item\.href\)/);
  assert.match(shell, /group\.id === "overview" \|\| groupActive/);
  assert.match(shell, /group\.items\.map/);
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
