export function safeCmsInternalHref(input: string | null | undefined) {
  const value = String(input ?? "").trim();
  if (!value || /[\r\n]/.test(value)) return "";

  if (value.startsWith("#")) {
    return /^#[A-Za-z0-9_-]+$/.test(value) ? value : "";
  }

  if (!value.startsWith("/") || value.startsWith("//")) return "";

  let url: URL;
  try {
    url = new URL(value, "https://ilkoku.local");
  } catch {
    return "";
  }

  if (url.origin !== "https://ilkoku.local") return "";

  const pathname = url.pathname.toLowerCase();
  const blockedPrefixes = ["/admin", "/icerik", "/api", "/_next", "/sistem-yonetimi"];
  if (blockedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return "";

  return `${url.pathname}${url.search}${url.hash}`.slice(0, 300);
}
