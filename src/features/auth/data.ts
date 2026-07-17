import { authContent } from "@/content";
import type { RoleOption } from "./types";

export const roleOptions: RoleOption[] = authContent.roleSelection.options.map((option) => ({
  ...option,
  highlights: [...option.highlights],
}));
