import type { ReactNode } from "react";

import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

import "./public-legal-frame.css";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <PublicSiteFrame>{children}</PublicSiteFrame>;
}
