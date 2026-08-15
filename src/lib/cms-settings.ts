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

export function parseCmsSettingsStrict(value: string): CmsSettings | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const settings = parsed as Record<string, unknown>;
    if (settings.defaultStatus !== "draft" && settings.defaultStatus !== "published") return null;
    if (settings.revisionRetention !== "all" && settings.revisionRetention !== "50" && settings.revisionRetention !== "20") return null;
    if (settings.defaultIndexing !== "index" && settings.defaultIndexing !== "noindex") return null;
    if (typeof settings.requirePublishPermission !== "boolean") return null;
    if (typeof settings.showDisabledModules !== "boolean") return null;
    return {
      defaultStatus: settings.defaultStatus,
      revisionRetention: settings.revisionRetention,
      defaultIndexing: settings.defaultIndexing,
      requirePublishPermission: settings.requirePublishPermission,
      showDisabledModules: settings.showDisabledModules,
    };
  } catch {
    return null;
  }
}
