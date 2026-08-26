import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";
import "../nasil-calisir/public-trust-footer.css";
import "./public-editors.css";

export default function PublicEditorsLayout({ children }: { children: ReactNode }) {
  return (
    <PublicSiteFrame>
      {children}
      <PublicTrustFooter />
    </PublicSiteFrame>
  );
}
