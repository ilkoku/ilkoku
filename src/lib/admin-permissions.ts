export type PlatformRole = "admin" | "publisher" | "editor" | "writer" | "reader";

export type PermissionKey =
  | "dashboard.view"
  | "works.review"
  | "works.publish"
  | "applications.review"
  | "users.manage"
  | "roles.manage"
  | "audit.view"
  | "publisher.workspace"
  | "editor.workspace"
  | "writer.workspace"
  | "reader.library";

export const roleLabels: Record<PlatformRole, string> = {
  admin: "Yönetici",
  publisher: "Yayınevi",
  editor: "Editör",
  writer: "Yazar",
  reader: "Okuyucu",
};

export const permissionLabels: Record<PermissionKey, string> = {
  "dashboard.view": "Yönetim panelini görüntüleme",
  "works.review": "Eserleri inceleme",
  "works.publish": "Eserleri yayına alma",
  "applications.review": "Başvuruları değerlendirme",
  "users.manage": "Kullanıcıları yönetme",
  "roles.manage": "Rol ve yetkileri yönetme",
  "audit.view": "Audit log görüntüleme",
  "publisher.workspace": "Yayınevi çalışma alanı",
  "editor.workspace": "Editör çalışma alanı",
  "writer.workspace": "Yazar çalışma alanı",
  "reader.library": "Okuyucu kütüphanesi",
};

export const rolePermissions: Record<PlatformRole, PermissionKey[]> = {
  admin: Object.keys(permissionLabels) as PermissionKey[],
  publisher: ["dashboard.view", "works.review", "applications.review", "publisher.workspace"],
  editor: ["dashboard.view", "works.review", "editor.workspace"],
  writer: ["writer.workspace", "reader.library"],
  reader: ["reader.library"],
};

export function hasPermission(role: PlatformRole, permission: PermissionKey) {
  return rolePermissions[role].includes(permission);
}
