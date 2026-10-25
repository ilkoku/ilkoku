/**
 * Validate a first-party return address and remove nested navigation history.
 *
 * A legacy book link may arrive as /kitap/a?from=/kitap/b?from=/kitap/c.
 * The incoming "from" target is the immediate previous page, not an
 * arbitrarily deep breadcrumb chain. Dropping nested "from" avoids emitting
 * a new crawlable URL at every book/passport hop.
 *
 * All other query parameters are retained. No redirects, storage, data
 * writes or changes to public content are involved.
 *
 * @param {string | undefined} value
 * @param {string} fallback
 * @param {number} maxLength
 */
export function safeOneHopReturnPath(value, fallback, maxLength = 1500) {
  if (
    !value ||
    value.length > maxLength ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\r\n]/u.test(value)
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://ilkoku.com");
    if (url.origin !== "https://ilkoku.com") return fallback;
    if (!url.searchParams.has("from")) return value;

    url.searchParams.delete("from");
    const normalized = `${url.pathname}${url.search}${url.hash}`;
    return normalized.length <= maxLength ? normalized : fallback;
  } catch {
    return fallback;
  }
}
