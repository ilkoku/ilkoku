export type CmsSettings = {
  defaultStatus: "draft" | "published";
  revisionRetention: "all" | "50" | "20";
  defaultIndexing: "index" | "noindex";
  requirePublishPermission: boolean;
  showDisabledModules: boolean;
};

export const defaultCmsSettings: CmsSettings = {
  defaultStatus: "draft",
  revisionRetention: "all",
  defaultIndexing: "index",
  requirePublishPermission: true,
  showDisabledModules: false,
};

export function parseCmsSettings(value: string | null | undefined): CmsSettings {
  if (!value) return defaultCmsSettings;
  try {
    const parsed = JSON.parse(value) as Partial<CmsSettings>;
    return {
      defaultStatus: parsed.defaultStatus === "published" ? "published" : "draft",
      revisionRetention: parsed.revisionRetention === "50" || parsed.revisionRetention === "20" ? parsed.revisionRetention : "all",
      defaultIndexing: parsed.defaultIndexing === "noindex" ? "noindex" : "index",
      requirePublishPermission: parsed.requirePublishPermission !== false,
      showDisabledModules: parsed.showDisabledModules === true,
    };
  } catch {
    return defaultCmsSettings;
  }
}
