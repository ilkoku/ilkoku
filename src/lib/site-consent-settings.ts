export type SiteConsentSettings = {
  bannerEnabled: boolean;
  analyticsEnabled: boolean;
  marketingEnabled: boolean;
  consentModeEnabled: boolean;
  rejectAllEnabled: boolean;
  policyPath: string;
  retentionDays: number;
};

export const defaultSiteConsentSettings: SiteConsentSettings = {
  bannerEnabled: false,
  analyticsEnabled: false,
  marketingEnabled: false,
  consentModeEnabled: true,
  rejectAllEnabled: true,
  policyPath: "/yasal/gizlilik-politikasi",
  retentionDays: 180,
};

function safePolicyPath(value: unknown) {
  if (typeof value !== "string") return defaultSiteConsentSettings.policyPath;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.length > 240) {
    return defaultSiteConsentSettings.policyPath;
  }
  return trimmed;
}

function safeRetentionDays(value: unknown) {
  const days = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return defaultSiteConsentSettings.retentionDays;
  }
  return days;
}

export function parseSiteConsentSettings(value: string | null | undefined): SiteConsentSettings {
  if (!value) return defaultSiteConsentSettings;

  try {
    const parsed = JSON.parse(value) as Partial<SiteConsentSettings>;
    return {
      bannerEnabled: parsed.bannerEnabled === true,
      analyticsEnabled: parsed.analyticsEnabled === true,
      marketingEnabled: parsed.marketingEnabled === true,
      consentModeEnabled: parsed.consentModeEnabled !== false,
      rejectAllEnabled: parsed.rejectAllEnabled !== false,
      policyPath: safePolicyPath(parsed.policyPath),
      retentionDays: safeRetentionDays(parsed.retentionDays),
    };
  } catch {
    return defaultSiteConsentSettings;
  }
}

export function parseSiteConsentSettingsStrict(value: string): SiteConsentSettings | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const settings = parsed as Record<string, unknown>;

    const bannerEnabled = settings.bannerEnabled;
    const analyticsEnabled = settings.analyticsEnabled;
    const marketingEnabled = settings.marketingEnabled;
    const consentModeEnabled = settings.consentModeEnabled;
    const rejectAllEnabled = settings.rejectAllEnabled;
    const policyPath = settings.policyPath;
    const retentionDays = settings.retentionDays;

    if (
      typeof bannerEnabled !== "boolean" ||
      typeof analyticsEnabled !== "boolean" ||
      typeof marketingEnabled !== "boolean" ||
      typeof consentModeEnabled !== "boolean" ||
      typeof rejectAllEnabled !== "boolean"
    ) return null;

    if (typeof policyPath !== "string") return null;
    if (!policyPath.startsWith("/") || policyPath.startsWith("//") || policyPath.length > 240) return null;
    if (typeof retentionDays !== "number" || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 365) return null;

    return {
      bannerEnabled,
      analyticsEnabled,
      marketingEnabled,
      consentModeEnabled,
      rejectAllEnabled,
      policyPath,
      retentionDays,
    };
  } catch {
    return null;
  }
}
