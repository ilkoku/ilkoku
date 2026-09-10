import type { Metadata } from "next";

import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { PublicPageTemplate } from "@/components/layout/PublicPageTemplate";
import { getCmsPageTemplate } from "@/lib/cms-page-templates";

const template = getCmsPageTemplate("ornek-roman");

export const metadata: Metadata = {
  title: "ÖRNEK · Roman Yazarlık Rehberi | İlkOku",
  description: template.seoDescription,
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrnekRomanYazarlikRehberiPage() {
  return (
    <PublicPageTemplate>
      <PublicCmsPageBlocks
        blocks={template.blocks}
        eyebrow="ÖRNEK · İlkOku"
        pageTitle="ÖRNEK · Roman Yazarlık Rehberi"
        summary={template.summary}
      />
    </PublicPageTemplate>
  );
}
