import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";
import { publicDiscoveryEnabled } from "@/lib/public-site-navigation";

import { PublicWorksExampleShowcase } from "./PublicWorksExampleShowcase";

import "../nasil-calisir/public-trust-footer.css";
import "./reference-hero.css";
import "./reference-content.css";
import "./public-works-example-showcase.css";

export default function PublicWorksLayout({ children }: { children: ReactNode }) {
  if (!publicDiscoveryEnabled) notFound();

  return (
    <PublicSiteFrame>
      {children}
      <PublicWorksExampleShowcase />
      <PublicTrustFooter />
    </PublicSiteFrame>
  );
}
