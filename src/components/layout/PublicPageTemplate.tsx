import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

import "@/app/nasil-calisir/public-trust-footer.css";

type PublicPageTemplateProps = {
  children: ReactNode;
  footer?: boolean;
};

/**
 * Canonical shell for new public İlkOku pages.
 *
 * Keeps the literary/terminal brand header, public back-navigation behavior and
 * canonical trust footer together so new pages cannot silently drift into a
 * second public-site identity.
 */
export function PublicPageTemplate({
  children,
  footer = true,
}: PublicPageTemplateProps) {
  return (
    <PublicSiteFrame>
      {children}
      {footer ? <PublicTrustFooter /> : null}
    </PublicSiteFrame>
  );
}
