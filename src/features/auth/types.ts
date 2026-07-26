export type UserRole = "reader" | "writer" | "editor_pending" | "editor" | "publisher" | "admin";
export type RegistrationRole = Exclude<UserRole, "admin" | "editor_pending">;

export interface RoleOption {
  id: RegistrationRole;
  icon: string;
  title: string;
  description: string;
  previewTitle: string;
  previewDescription: string;
  highlights: string[];
  href: string;
  actionLabel: string;
}
