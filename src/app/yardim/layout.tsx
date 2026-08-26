import type { ReactNode } from "react";

import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

export default function PublicHelpLayout({ children }: { children: ReactNode }) {
  return <PublicSiteFrame>{children}</PublicSiteFrame>;
}
