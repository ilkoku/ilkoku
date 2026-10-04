const SOFT_LAUNCH_NOINDEX_EXACT_PATHS: ReadonlySet<string> = new Set([
  "/nasil-calisir",
  "/yazarlar-icin",
  "/editorler-icin",
  "/yayinevleri-icin",
  "/editoryal-standartlar",
  "/yardim",
  "/iletisim",
  "/site-haritasi",
  "/yasal/kullanim-sartlari",
  "/yasal/gizlilik-politikasi",
  "/yasal/kvkk",
  "/yasal/cerez-politikasi",
  "/yasal/telif-hakki-politikasi",
  "/yeni-cikanlar",
] as const);

const SOFT_LAUNCH_NOINDEX_PREFIXES = [
  "/en-cok-satanlar",
] as const;

function normalizePublicPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";

  let path = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      path = new URL(trimmed).pathname;
    } catch {
      return trimmed;
    }
  } else {
    path = trimmed.split(/[?#]/u, 1)[0] || "/";
  }

  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/u, "");
  return path || "/";
}

export function isSoftLaunchSearchExcludedPath(value: string) {
  const path = normalizePublicPath(value);

  if (SOFT_LAUNCH_NOINDEX_EXACT_PATHS.has(path)) {
    return true;
  }

  return SOFT_LAUNCH_NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function filterSoftLaunchSitemapEntries<T extends { url: string }>(
  entries: T[],
): T[] {
  return entries.filter((entry) => !isSoftLaunchSearchExcludedPath(entry.url));
}
