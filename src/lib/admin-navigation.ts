export type AdminNavItem = {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "users"
    | "works"
    | "authors"
    | "editors"
    | "publishers"
    | "readers"
    | "comments"
    | "applications"
    | "audit"
    | "email"
    | "settings";
  badge?: string;
};

export const SYSTEM_MANAGEMENT_PATH = "/sistem-yonetimi";

function systemPath(path = "") {
  return `${SYSTEM_MANAGEMENT_PATH}${path}`;
}

export const adminNavigation: AdminNavItem[] = [
  { href: systemPath(), label: "Genel Bakış", icon: "dashboard" },
  { href: "/harita", label: "Sistem Haritası", icon: "audit" },
  { href: "/sozlesme", label: "Sözleşme Yönetimi", icon: "applications" },
  { href: systemPath("/demo"), label: "Demo Veri Merkezi", icon: "applications" },
  { href: systemPath("/kullanicilar"), label: "Kullanıcılar", icon: "users" },
  { href: systemPath("/eserler"), label: "Eserler", icon: "works" },
  { href: systemPath("/yazarlar"), label: "Yazarlar", icon: "authors" },
  { href: systemPath("/editorler"), label: "Editörler", icon: "editors" },
  { href: systemPath("/yayinevleri"), label: "Yayınevleri", icon: "publishers" },
  { href: systemPath("/okuyucular"), label: "Okuyucular", icon: "readers" },
  { href: systemPath("/yorumlar"), label: "Yorumlar", icon: "comments" },
  { href: systemPath("/basvurular"), label: "Başvurular", icon: "applications" },
  { href: systemPath("/roller"), label: "Rol ve Yetkiler", icon: "settings" },
  { href: systemPath("/arsiv"), label: "Arşiv Merkezi", icon: "audit" },
  { href: systemPath("/epostalar"), label: "E-postalar", icon: "email" },
  { href: systemPath("/eposta-operasyonlari"), label: "E-posta Operasyonları", icon: "email" },
  { href: systemPath("/okuma-guvenligi"), label: "Okuma Güvenliği", icon: "audit" },
  { href: systemPath("/audit-log"), label: "Audit Log", icon: "audit" },
  { href: systemPath("/ayarlar"), label: "Ayarlar", icon: "settings" },
];
