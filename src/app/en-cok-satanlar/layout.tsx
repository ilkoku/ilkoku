import type { ReactNode } from "react";

import { PublicTrustFooter } from "@/components/content/PublicTrustFooter";
import { BookIndexAnalytics } from "@/features/book-index/public/BookIndexAnalytics";
import { PublicSiteFrame } from "@/components/layout/PublicSiteFrame";
import "../nasil-calisir/public-trust-footer.css";

export default function BookIndexLayout({ children }: { children: ReactNode }) {
  return (
    <PublicSiteFrame>
      <BookIndexAnalytics />
      {children}
      <PublicTrustFooter />
    </PublicSiteFrame>
  );
}
