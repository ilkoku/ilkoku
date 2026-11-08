const PUBLIC_ORIGIN = "https://ilkoku.com";

/**
 * Limit post-auth navigation to a first-party path.
 *
 * Checking only startsWith("/") is not sufficient: a path beginning with
 * slash + backslash can be interpreted as a protocol-relative URL by browsers.
 * Always parse against the canonical origin and reject unsafe separators.
 *
 * @param {string} value
 * @param {number} maxLength
 * @returns {string}
 */
export function safeAuthNextPath(value, maxLength = 5000) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.length > maxLength ||
    /[\\\u0000-\u001f\u007f]/u.test(value)
  ) {
    return "";
  }

  try {
    const destination = new URL(value, PUBLIC_ORIGIN);
    if (
      destination.origin !== PUBLIC_ORIGIN ||
      !destination.pathname.startsWith("/") ||
      destination.pathname.startsWith("//")
    ) {
      return "";
    }

    const normalized = destination.pathname + destination.search + destination.hash;
    return normalized.length <= maxLength ? normalized : "";
  } catch {
    return "";
  }
}
