import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

import "../nasil-calisir/public-trust-footer.css";
import "./reference-hero.css";
import "./reference-content.css";

export default function PublicWorksLayout({ children }: { children: ReactNode }) {
  return (
    <PublicSiteFrame>
      {children}
      <PublicTrustFooter />
    </PublicSiteFrame>
  );
}
