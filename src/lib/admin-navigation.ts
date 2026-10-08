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

export type AdminNavGroup = {
  id:
    | "overview"
    | "people"
    | "content"
    | "commerce"
    | "communications"
    | "security"
    | "archive";
  label: string;
  description: string;
  icon: AdminNavItem["icon"];
  items: readonly AdminNavItem[];
};

export const SYSTEM_MANAGEMENT_PATH = "/sistem-yonetimi";

function systemPath(path = "") {
  return `${SYSTEM_MANAGEMENT_PATH}${path}`;
}

export const adminNavigationGroups: readonly AdminNavGroup[] = [
  {
    id: "overview",
    label: "Genel Bakış",
    description: "Platform özeti ve ana yönetim ekranı",
    icon: "dashboard",
    items: [
      { href: systemPath(), label: "Kontrol Merkezi", icon: "dashboard" },
    ],
  },
  {
    id: "people",
    label: "Kullanıcı & Roller",
    description: "Üyeler, roller, başvurular ve topluluk",
    icon: "users",
    items: [
      { href: systemPath("/kullanicilar"), label: "Kullanıcılar", icon: "users" },
      { href: systemPath("/yazarlar"), label: "Yazarlar", icon: "authors" },
      { href: systemPath("/editorler"), label: "Editörler", icon: "editors" },
      { href: systemPath("/yayinevleri"), label: "Yayınevleri", icon: "publishers" },
      { href: systemPath("/okuyucular"), label: "Okuyucular", icon: "readers" },
      { href: systemPath("/basvurular"), label: "Başvurular", icon: "applications" },
      { href: systemPath("/roller"), label: "Rol ve Yetkiler", icon: "settings" },
      { href: systemPath("/yorumlar"), label: "Yorumlar", icon: "comments" },
    ],
  },
  {
    id: "content",
    label: "Eser & İçerik",
    description: "Eserler, CMS ve kitap veri alanları",
    icon: "works",
    items: [
      { href: systemPath("/eserler"), label: "Eserler", icon: "works" },
      { href: "/icerik", label: "İçerik Yönetimi", icon: "works" },
      { href: systemPath("/kitap-endeksi"), label: "Kitap Endeksi", icon: "works" },
    ],
  },
  {
    id: "commerce",
    label: "Ticaret & Finans",
    description: "Ödeme, gelir ve finans operasyonları",
    icon: "applications",
    items: [
      { href: systemPath("/odeme-sistemi"), label: "Ödeme Sistemi", icon: "applications" },
      { href: systemPath("/finans-gelirler"), label: "Finans & Gelirler", icon: "audit" },
    ],
  },
  {
    id: "communications",
    label: "İletişim & Sözleşmeler",
    description: "Sözleşme ve e-posta operasyonları",
    icon: "email",
    items: [
      { href: "/sozlesme", label: "Sözleşme Yönetimi", icon: "applications" },
      { href: systemPath("/epostalar"), label: "E-postalar", icon: "email" },
      { href: systemPath("/eposta-operasyonlari"), label: "E-posta Operasyonları", icon: "email" },
    ],
  },
  {
    id: "security",
    label: "Güvenlik & Sistem",
    description: "Sistem sağlığı, denetim ve güvenlik",
    icon: "audit",
    items: [
      { href: "/harita", label: "Sistem Haritası", icon: "audit" },
      { href: systemPath("/okuma-guvenligi"), label: "Okuma Güvenliği", icon: "audit" },
      { href: systemPath("/audit-log"), label: "Audit Log", icon: "audit" },
    ],
  },
  {
    id: "archive",
    label: "Arşiv & Ayarlar",
    description: "Arşiv, silme, demo verisi ve sistem ayarları",
    icon: "settings",
    items: [
      { href: systemPath("/arsiv"), label: "Arşiv Merkezi", icon: "audit" },
      { href: systemPath("/silme-merkezi"), label: "Silme Merkezi", icon: "audit" },
      { href: systemPath("/demo"), label: "Demo Veri Merkezi", icon: "applications" },
      { href: systemPath("/ayarlar"), label: "Ayarlar", icon: "settings" },
    ],
  },
] as const;

export const adminNavigation: AdminNavItem[] = adminNavigationGroups.flatMap(
  (group) => [...group.items],
);
