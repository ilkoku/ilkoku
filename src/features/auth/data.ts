import { authContent } from "@/content";
import type { RoleOption, UserRole } from "./types";

export const roleDestinations: Record<UserRole, string> = {
  admin: "/admin",
  editor_pending: "/hesabim?sekme=rol-basvurusu",
  editor: "/editor",
  publisher: "/yayinevi",
  reader: "/okuyucu",
  writer: "/yazar",
};

export const readerWorkspaceRoles: readonly UserRole[] = [
  "reader",
  "editor_pending",
  "editor",
];

export const notificationWorkspaceRoles: readonly UserRole[] = [
  "reader",
  "writer",
  "editor_pending",
  "editor",
];

export function canAccessReaderWorkspace(role: UserRole) {
  return readerWorkspaceRoles.includes(role);
}

export function canAccessNotificationWorkspace(role: UserRole) {
  return notificationWorkspaceRoles.includes(role);
}

export function getWorkspaceDestination(role: UserRole) {
  return role === "editor_pending"
    ? roleDestinations.reader
    : roleDestinations[role];
}

export const roleOptions: RoleOption[] = authContent.roleSelection.options.map((option) => ({
  ...option,
  highlights: [...option.highlights],
}));
