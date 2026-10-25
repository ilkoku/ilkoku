import type { ReactNode } from "react";

import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

// Footer styling must be part of the writer route CSS bundle, as on app/page.tsx.
import "../landing-footer-pro.css";
import "../landing-footer-tight.css";
import "./real-covers.css";

export default function ForWritersLayout({ children }: { children: ReactNode }) {
  return <PublicSiteFrame>{children}</PublicSiteFrame>;
}
