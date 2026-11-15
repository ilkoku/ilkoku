/**
 * Resolve the public homepage secondary CTA after CMS URL validation.
 * The reader workspace /kesfet is authenticated and noindexed. A public
 * homepage CTA must lead to /eserler rather than advertising this private route.
 *
 * @param {string | undefined | null} cmsHref
 */
export function resolveHomepageSecondaryHref(cmsHref) {
  if (/^\/kesfet(?:$|[/?#])/u.test(cmsHref ?? "")) {
    return "/eserler";
  }

  return cmsHref || "/nasil-calisir";
}
