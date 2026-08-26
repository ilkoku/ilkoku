import type { ReactNode } from "react";

import { PublicBackNavigation } from "@/components/layout/PublicBackNavigation";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import "./public-site-frame.css";

export function PublicSiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="public-site-frame">
      <PublicSiteHeader />
      <PublicBackNavigation />
      {children}
    </div>
  );
}
