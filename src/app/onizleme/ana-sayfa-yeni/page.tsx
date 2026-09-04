import type { Metadata } from "next";

import HomepageExperience from "./HomepageExperience";
import "./preview.css";

export const metadata: Metadata = {
  title: "Ana Sayfa Yeniden Tasarım Çalışması | İlkOku",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const dynamic = "force-dynamic";

export default HomepageExperience;
