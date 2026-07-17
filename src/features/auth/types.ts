export type UserRole = "reader" | "writer" | "editor" | "publisher";

export interface RoleOption {
  id: UserRole;
  icon: string;
  title: string;
  description: string;
  previewTitle: string;
  previewDescription: string;
  highlights: string[];
  href: string;
  actionLabel: string;
}
