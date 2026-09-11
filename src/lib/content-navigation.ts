import { cmsModules, type CmsModuleGroup } from "@/lib/cms-modules";

export type ContentNavItem = {
  href: string;
  label: string;
  description: string;
  group: CmsModuleGroup;
  adminOnly?: boolean;
  showInNavigation: boolean;
};

export const contentNavigation: ContentNavItem[] = cmsModules
  .filter((item) => item.enabled)
  .map(({ href, label, description, group, adminOnly, showInNavigation }) => ({
    href,
    label,
    description,
    group,
    adminOnly,
    showInNavigation: showInNavigation !== false,
  }));
