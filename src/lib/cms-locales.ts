export type CmsLocale = {
  code: string;
  label: string;
  enabled: boolean;
  isDefault: boolean;
};

export const cmsLocales: CmsLocale[] = [
  { code: "tr", label: "Türkçe", enabled: true, isDefault: true },
  { code: "en", label: "English", enabled: false, isDefault: false },
];

export const defaultCmsLocale = "tr";

export function isEnabledCmsLocale(code: string) {
  return cmsLocales.some((locale) => locale.code === code && locale.enabled);
}
