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

export const adminNavigation: AdminNavItem[] = [
  { href: "/admin", label: "Genel Bakış", icon: "dashboard" },
  { href: "/admin/kullanicilar", label: "Kullanıcılar", icon: "users" },
  { href: "/admin/eserler", label: "Eserler", icon: "works" },
  { href: "/admin/yazarlar", label: "Yazarlar", icon: "authors" },
  { href: "/admin/editorler", label: "Editörler", icon: "editors" },
  { href: "/admin/yayinevleri", label: "Yayınevleri", icon: "publishers" },
  { href: "/admin/okuyucular", label: "Okuyucular", icon: "readers" },
  { href: "/admin/yorumlar", label: "Yorumlar", icon: "comments" },
  { href: "/admin/basvurular", label: "Başvurular", icon: "applications" },
  { href: "/admin/roller", label: "Rol ve Yetkiler", icon: "settings" },
  { href: "/admin/arsiv", label: "Arşiv Merkezi", icon: "audit" },
  { href: "/admin/epostalar", label: "E-postalar", icon: "email" },
  { href: "/admin/okuma-guvenligi", label: "Okuma Güvenliği", icon: "audit" },
  { href: "/admin/audit-log", label: "Audit Log", icon: "audit" },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: "settings" },
];
