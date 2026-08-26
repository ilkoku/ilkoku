import type { ReactNode } from "react";

import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

export default function CopyrightNoticeLayout({ children }: { children: ReactNode }) {
  return <PublicSiteFrame>{children}</PublicSiteFrame>;
}
