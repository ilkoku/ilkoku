import { PublicSiteFooter } from "@/components/content/PublicSiteFooter";
import { getBookIndexFooterDiscoveryEnabled } from "@/lib/book-index/public-access";
import { getPublicSiteIdentity } from "@/lib/site-identity";

// Compatibility entry-point for existing public routes; not a second renderer.
export async function PublicTrustFooter() {
  const [identity, bookIndexPublished] = await Promise.all([
    getPublicSiteIdentity(),
    getBookIndexFooterDiscoveryEnabled().catch(() => false),
  ]);
  return <PublicSiteFooter variant="trust" identity={identity} bookIndexPublished={bookIndexPublished} />;
}
