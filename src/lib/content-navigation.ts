import { cmsModules } from "@/lib/cms-modules";

export type ContentNavItem = {
  href: string;
  label: string;
  description: string;
  group: "Site" | "İçerik" | "Büyüme" | "Sistem";
};

export const contentNavigation: ContentNavItem[] = cmsModules
  .filter((item) => item.enabled)
  .map(({ href, label, description, group }) => ({ href, label, description, group }));
