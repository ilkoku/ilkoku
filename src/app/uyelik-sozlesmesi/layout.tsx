import type { ReactNode } from "react";

import { createPublicPageMetadata } from "@/lib/public-page-metadata";

// Resolve this route's fixed SEO metadata at the segment layout boundary,
// independently of the dynamic active-agreement database read in page.tsx.
export const metadata = createPublicPageMetadata({
  title: "Platform Kullanım ve Gizlilik Taahhüdü | İlkOku",
  description: "İlkOku Platform Kullanım ve Gizlilik Taahhüdü: hesap oluştururken kabul edilen temel üyelik, platform kullanımı ve gizlilik koşullarını inceleyin.",
  canonical: "/uyelik-sozlesmesi",
});

export default function RegistrationAgreementLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
