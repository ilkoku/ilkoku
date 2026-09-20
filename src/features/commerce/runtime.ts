import "server-only";

/**
 * Commerce is staged behind a server-side rollout flag.
 *
 * Until checkout is intentionally enabled, paid configurations may be prepared
 * by writers/admins but reader access must keep the current free-reading
 * behavior. This prevents a paid work from becoming unreadable before there is
 * a functioning payment path.
 */
export function isCommerceCheckoutEnabled() {
  return process.env.COMMERCE_CHECKOUT_ENABLED === "true";
}
