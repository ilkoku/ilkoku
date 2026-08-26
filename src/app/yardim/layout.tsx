import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";
import "../nasil-calisir/public-trust-footer.css";
import "./help.css";

export default function PublicHelpLayout({ children }: { children: ReactNode }) {
  return (
    <PublicSiteFrame>
      {children}
      <PublicTrustFooter />
    </PublicSiteFrame>
  );
}
