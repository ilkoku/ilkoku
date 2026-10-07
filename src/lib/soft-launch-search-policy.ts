const SOFT_LAUNCH_INDEXABLE_EXACT_PATHS: ReadonlySet<string> = new Set([
  "/nasil-calisir",
  "/hakkimizda",
  "/yazarlar-icin",
  "/okurlar-icin",
  "/editorler-icin",
  "/yayinevleri-icin",
  "/editoryal-standartlar",
  "/yazarlar-icin/kurgu",
  "/yazarlar-icin/edebiyat",
  "/yazarlar-icin/akademik",
  "/yazarlar-icin/bilgilendirici",
  "/yazarlar-icin/senaryo-ve-sahne",
  "/yazarlar-icin/cocuk-ve-genclik",
  "/yazarlar-icin/cizgi-anlati",
  "/yazarlar-icin/kurgu/roman",
  "/yazarlar-icin/kurgu/oyku",
  "/yazarlar-icin/kurgu/fantastik",
  "/yazarlar-icin/kurgu/bilim-kurgu",
  "/yazarlar-icin/kurgu/distopya",
  "/yazarlar-icin/edebiyat/siir",
  "/okurlar-icin/okumaya-baslama",
  "/editorler-icin/egitim/editorluge-baslama",
  "/editorler-icin/egitim/dil-ve-anlatim-editorlugu",
  "/editorler-icin/egitim/metin-degerlendirme",
] as const);

const SOFT_LAUNCH_NOINDEX_EXACT_PATHS: ReadonlySet<string> = new Set([
  "/yardim",
  "/iletisim",
  "/site-haritasi",
  "/topluluk-kurallari",
  "/icerik-ve-yas-politikasi",
  "/telif-bildirimi",
  "/yasal/kullanim-sartlari",
  "/yasal/gizlilik-politikasi",
  "/yasal/kvkk",
  "/yasal/cerez-politikasi",
  "/yasal/telif-hakki-politikasi",
  "/yeni-cikanlar",
] as const);

const SOFT_LAUNCH_NOINDEX_PREFIXES = [
  "/en-cok-satanlar",
  "/yazarlar-icin",
  "/okurlar-icin",
  "/editorler-icin/egitim",
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

export function isSoftLaunchSearchPriorityPath(value: string) {
  const path = normalizePublicPath(value);
  return SOFT_LAUNCH_INDEXABLE_EXACT_PATHS.has(path);
}

export function isSoftLaunchSearchExcludedPath(value: string) {
  const path = normalizePublicPath(value);

  if (SOFT_LAUNCH_INDEXABLE_EXACT_PATHS.has(path)) {
    return false;
  }

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
