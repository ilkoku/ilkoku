import { authContent } from "@/content";
import type { RoleOption, UserRole } from "./types";

export const roleDestinations: Record<UserRole, string> = {
  admin: "/admin",
  editor: "/editörler",
  publisher: "/yayinevi",
  reader: "/kitap/kayip-sehir",
  writer: "/yazar",
};

export const roleOptions: RoleOption[] = authContent.roleSelection.options.map((option) => ({
  ...option,
  highlights: [...option.highlights],
}));
