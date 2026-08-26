import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";

import { PublicWorksExampleShowcase } from "./PublicWorksExampleShowcase";

import "../nasil-calisir/public-trust-footer.css";
import "./reference-hero.css";
import "./reference-content.css";
import "./public-works-example-showcase.css";

export default function PublicWorksLayout({ children }: { children: ReactNode }) {
  return (
    <PublicSiteFrame>
      {children}
      <PublicWorksExampleShowcase />
      <PublicTrustFooter />
    </PublicSiteFrame>
  );
}
