export type AdminNavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "works" | "authors" | "editors" | "publishers" | "applications" | "audit" | "settings";
  badge?: string;
};

export const adminNavigation: AdminNavItem[] = [
  { href: "/admin", label: "Genel Bakış", icon: "dashboard" },
  { href: "/admin/eserler", label: "Eserler", icon: "works", badge: "41" },
  { href: "/admin/yazarlar", label: "Yazarlar", icon: "authors" },
  { href: "/admin/editorler", label: "Editörler", icon: "editors" },
  { href: "/admin/yayinevleri", label: "Yayınevleri", icon: "publishers" },
  { href: "/admin/basvurular", label: "Başvurular", icon: "applications", badge: "25" },
  { href: "/admin/roller", label: "Rol ve Yetkiler", icon: "settings" },
  { href: "/admin/audit-log", label: "Audit Log", icon: "audit" },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: "settings" },
];
