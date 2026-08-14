export type CmsRedirectValue = {
  source: string;
  target: string;
  code: 308;
};

const protectedPrefixes = ["/api", "/admin", "/icerik", "/sistem-yonetimi", "/_next"];

function hasProtectedPrefix(path: string) {
  return protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function normalizeCmsRedirectPath(value: FormDataEntryValue | string | null, kind: "source" | "target") {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://") || raw.includes("\\")) {
    throw new Error("Yalnız site içi / ile başlayan yollar kullanılabilir.");
  }

  const withoutHash = raw.split("#", 1)[0] ?? raw;
  const withoutQuery = withoutHash.split("?", 1)[0] ?? withoutHash;
  const compact = withoutQuery.replace(/\/{2,}/g, "/");
  const normalized = compact.length > 1 ? compact.replace(/\/+$/, "") : compact;

  if (!normalized || normalized.length > 150) throw new Error("Yönlendirme yolu geçersiz veya çok uzun.");
  if (kind === "source" && normalized === "/") throw new Error("Ana sayfa kaynak yönlendirme olarak kullanılamaz.");
  if (hasProtectedPrefix(normalized)) throw new Error("Yönetim, API ve sistem yolları yönlendirilemez.");

  return normalized;
}

export function parseCmsRedirectValue(valueJson: string): CmsRedirectValue | null {
  try {
    const value = JSON.parse(valueJson) as Partial<CmsRedirectValue>;
    const source = normalizeCmsRedirectPath(value.source ?? "", "source");
    const target = normalizeCmsRedirectPath(value.target ?? "", "target");
    if (source === target || value.code !== 308) return null;
    return { source, target, code: 308 };
  } catch {
    return null;
  }
}

export function createsCmsRedirectCycle(source: string, target: string, rows: Array<{ source: string; target: string }>) {
  const map = new Map(rows.map((row) => [row.source, row.target]));
  map.set(source, target);

  const visited = new Set<string>();
  let current = source;

  for (let step = 0; step < 101; step += 1) {
    if (visited.has(current)) return true;
    visited.add(current);
    const next = map.get(current);
    if (!next) return false;
    current = next;
  }

  return true;
}
