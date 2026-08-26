import type { ReactNode } from "react";

import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";

export function PublicSiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="public-site-frame">
      <PublicSiteHeader />
      {children}
    </div>
  );
}
