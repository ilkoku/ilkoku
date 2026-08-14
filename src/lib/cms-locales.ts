export type CmsLocaleCode = "tr" | "en";

export type CmsLocale = {
  code: CmsLocaleCode;
  label: string;
  isDefault: boolean;
};

export const cmsLocales: CmsLocale[] = [
  { code: "tr", label: "Türkçe", isDefault: true },
  { code: "en", label: "English", isDefault: false },
];

export const defaultCmsLocale: CmsLocaleCode = "tr";

export function normalizeCmsLocale(value: unknown): CmsLocaleCode {
  return value === "en" ? "en" : defaultCmsLocale;
}

export function cmsLocaleNamespace(
  baseNamespace: string,
  locale: CmsLocaleCode,
) {
  return locale === defaultCmsLocale
    ? baseNamespace
    : `${baseNamespace}_${locale}`;
}

export function cmsLocalePublicPath(
  path: string,
  locale: CmsLocaleCode,
) {
  if (locale === defaultCmsLocale) return path;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}
