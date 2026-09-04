import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";
import { publicDiscoveryEnabled } from "@/lib/public-site-navigation";

import "../nasil-calisir/public-trust-footer.css";

export default function PublicAuthorsLayout({ children }: { children: ReactNode }) {
  if (!publicDiscoveryEnabled) notFound();

  return (
    <PublicSiteFrame>
      {children}
      <PublicTrustFooter />
    </PublicSiteFrame>
  );
}
