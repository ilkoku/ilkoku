import type { Metadata } from "next";

import LegacyHomePage from "../../legacy-home-page";

export const metadata: Metadata = {
  title: "Önceki Ana Sayfa Arşivi | İlkOku",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const dynamic = "force-dynamic";

export default LegacyHomePage;
