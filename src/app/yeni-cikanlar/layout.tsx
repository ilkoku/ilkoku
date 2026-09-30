import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";
import { BookIndexAnalytics } from "@/features/book-index/public/BookIndexAnalytics";

import "../nasil-calisir/public-trust-footer.css";

export default function NewReleasesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PublicSiteFrame>
      <BookIndexAnalytics />
      {children}
      <PublicTrustFooter />
    </PublicSiteFrame>
  );
}
