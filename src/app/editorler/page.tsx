import type { Metadata } from "next";
import { EditorDirectory } from "@/features/editors/components/EditorDirectory";

const baseUrl = "https://ilkoku.com";
const title = "Editörleri Keşfet | İlkOku";
const description = "İlkOku'da doğrulanmış editör profillerini, uzmanlıklarını ve editoryal yaklaşımı keşfedin; editör modelini ve değerlendirme standartlarını inceleyin.";
const socialImage = "/opengraph-image";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/editorler",
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/editorler",
    title,
    description,
    images: [{ url: socialImage, alt: "İlkOku editör keşfi" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};
export const dynamic = "force-dynamic";

export default function EditorsPage() {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "İlkOku editörleri",
      description,
      url: `${baseUrl}/editorler`,
      inLanguage: "tr-TR",
      isPartOf: { "@type": "WebSite", name: "İlkOku", url: baseUrl },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${baseUrl}/` },
        { "@type": "ListItem", position: 2, name: "Editörler", item: `${baseUrl}/editorler` },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <EditorDirectory />
    </>
  );
}
