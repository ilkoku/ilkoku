export type UserRole = "reader" | "writer" | "editor" | "publisher" | "admin";
export type RegistrationRole = Exclude<UserRole, "admin">;

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
