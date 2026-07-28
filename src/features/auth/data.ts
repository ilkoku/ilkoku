import { authContent } from "@/content";
import type { RoleOption, UserRole } from "./types";

export const roleDestinations: Record<UserRole, string> = {
  admin: "/admin",
  editor_pending: "/rol-secimi?durum=talep-alindi&rol=editor",
  editor: "/editor/kesfet",
  publisher: "/yayinevi",
  reader: "/okuyucu",
  writer: "/yazar",
};

export const roleOptions: RoleOption[] = authContent.roleSelection.options.map((option) => ({
  ...option,
  highlights: [...option.highlights],
}));
