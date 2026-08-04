import type { UserRole } from "@/features/auth/types";

export const adminRoleViewRoles = [
  "reader",
  "writer",
  "editor",
  "publisher",
] as const;

export type AdminRoleViewRole =
  (typeof adminRoleViewRoles)[number];

export const adminPublisherViewRoles = [
  "owner",
  "manager",
  "submissions_manager",
  "editorial",
  "reviewer",
  "viewer",
] as const;

export type AdminPublisherViewRole =
  (typeof adminPublisherViewRoles)[number];

export const adminRoleViewLabels: Record<
  AdminRoleViewRole,
  string
> = {
  editor: "Editör",
  publisher: "Yayınevi",
  reader: "Okur",
  writer: "Yazar",
};

export const adminPublisherViewRoleLabels: Record<
  AdminPublisherViewRole,
  string
> = {
  editorial: "Editoryal kullanıcı",
  manager: "Yönetici",
  owner: "Yayınevi sahibi",
  reviewer: "Değerlendirici",
  submissions_manager: "Editoryal yönetici",
  viewer: "Salt okunur kullanıcı",
};

export const adminRoleViewDestinations: Record<
  AdminRoleViewRole,
  string
> = {
  editor: "/editor/kesfet",
  publisher: "/yayinevi",
  reader: "/okuyucu",
  writer: "/yazar",
};

export function isAdminRoleViewRole(
  value: unknown,
): value is AdminRoleViewRole {
  return adminRoleViewRoles.includes(
    value as AdminRoleViewRole,
  );
}

export function isAdminPublisherViewRole(
  value: unknown,
): value is AdminPublisherViewRole {
  return adminPublisherViewRoles.includes(
    value as AdminPublisherViewRole,
  );
}

export function isStoredAdminRole(
  role: UserRole,
): role is "admin" {
  return role === "admin";
}
