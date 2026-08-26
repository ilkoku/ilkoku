import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

import "../nasil-calisir/public-trust-footer.css";

export default function PublicAuthorsLayout({ children }: { children: ReactNode }) {
  return (
    <PublicSiteFrame>
      {children}
      <PublicTrustFooter />
    </PublicSiteFrame>
  );
}
