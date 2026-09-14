export type SiteAnalyticsSettings = {
  enabled: boolean;
  gtmEnabled: boolean;
  ga4Enabled: boolean;
  gtmId: string;
  ga4MeasurementId: string;
  consentRequired: boolean;
  debugMode: boolean;
};

export const defaultSiteAnalyticsSettings: SiteAnalyticsSettings = {
  enabled: false,
  gtmEnabled: false,
  ga4Enabled: false,
  gtmId: "",
  ga4MeasurementId: "",
  consentRequired: true,
  debugMode: false,
};

const GTM_PATTERN = /^GTM-[A-Z0-9]+$/i;
const GA4_PATTERN = /^G-[A-Z0-9]+$/i;

export function isValidGtmId(value: string) {
  return !value || GTM_PATTERN.test(value.trim());
}

export function isValidGa4MeasurementId(value: string) {
  return !value || GA4_PATTERN.test(value.trim());
}

export function parseSiteAnalyticsSettings(raw: string): SiteAnalyticsSettings {
  try {
    const parsed = JSON.parse(raw) as Partial<SiteAnalyticsSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      gtmEnabled: Boolean(parsed.gtmEnabled),
      ga4Enabled: Boolean(parsed.ga4Enabled),
      gtmId: typeof parsed.gtmId === "string" ? parsed.gtmId.trim().toUpperCase() : "",
      ga4MeasurementId:
        typeof parsed.ga4MeasurementId === "string" ? parsed.ga4MeasurementId.trim().toUpperCase() : "",
      consentRequired: parsed.consentRequired !== false,
      debugMode: Boolean(parsed.debugMode),
    };
  } catch {
    return defaultSiteAnalyticsSettings;
  }
}

export function parseSiteAnalyticsSettingsStrict(raw: string): SiteAnalyticsSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SiteAnalyticsSettings>;
    if (
      typeof parsed.enabled !== "boolean" ||
      typeof parsed.gtmEnabled !== "boolean" ||
      typeof parsed.ga4Enabled !== "boolean" ||
      typeof parsed.gtmId !== "string" ||
      typeof parsed.ga4MeasurementId !== "string" ||
      typeof parsed.consentRequired !== "boolean" ||
      typeof parsed.debugMode !== "boolean"
    ) {
      return null;
    }

    const settings: SiteAnalyticsSettings = {
      enabled: parsed.enabled,
      gtmEnabled: parsed.gtmEnabled,
      ga4Enabled: parsed.ga4Enabled,
      gtmId: parsed.gtmId.trim().toUpperCase(),
      ga4MeasurementId: parsed.ga4MeasurementId.trim().toUpperCase(),
      consentRequired: parsed.consentRequired,
      debugMode: parsed.debugMode,
    };

    if (!isValidGtmId(settings.gtmId) || !isValidGa4MeasurementId(settings.ga4MeasurementId)) return null;
    return settings;
  } catch {
    return null;
  }
}

export function validateSiteAnalyticsSettings(settings: SiteAnalyticsSettings) {
  const errors: string[] = [];
  if (settings.gtmEnabled && !settings.gtmId) errors.push("GTM etkin ancak Container ID boş.");
  if (settings.ga4Enabled && !settings.ga4MeasurementId) errors.push("GA4 etkin ancak Measurement ID boş.");
  if (!isValidGtmId(settings.gtmId)) errors.push("GTM ID biçimi geçersiz. Örnek: GTM-XXXXXXX.");
  if (!isValidGa4MeasurementId(settings.ga4MeasurementId)) errors.push("GA4 Measurement ID biçimi geçersiz. Örnek: G-XXXXXXXXXX.");
  if (settings.enabled && !settings.gtmEnabled && !settings.ga4Enabled) errors.push("Analytics ana anahtarı açık ancak hiçbir sağlayıcı etkin değil.");
  return errors;
}
