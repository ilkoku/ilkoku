import type { ReactNode } from "react";

import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

export default function CommunityRulesLayout({ children }: { children: ReactNode }) {
  return <PublicSiteFrame>{children}</PublicSiteFrame>;
}
