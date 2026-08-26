import type { ReactNode } from "react";

import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

export default function HowItWorksLayout({ children }: { children: ReactNode }) {
  return <PublicSiteFrame>{children}</PublicSiteFrame>;
}
