import { cmsModules } from "@/lib/cms-modules";

export type ContentNavItem = {
  href: string;
  label: string;
  description: string;
  group: "Site" | "İçerik" | "Büyüme" | "Sistem";
  adminOnly?: boolean;
};

export const contentNavigation: ContentNavItem[] = cmsModules
  .filter((item) => item.enabled)
  .map(({ href, label, description, group, adminOnly }) => ({ href, label, description, group, adminOnly }));
