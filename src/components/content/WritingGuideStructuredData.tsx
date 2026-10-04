type WritingGuideStructuredDataProps = {
  canonicalUrl: string;
  title: string;
  description: string;
  categoryName: string;
  categoryUrl: string;
};

export function WritingGuideStructuredData({
  canonicalUrl,
  title,
  description,
  categoryName,
  categoryUrl,
}: WritingGuideStructuredDataProps) {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${canonicalUrl}#article`,
      headline: title,
      description,
      inLanguage: "tr-TR",
      mainEntityOfPage: canonicalUrl,
      author: {
        "@type": "Organization",
        "@id": "https://ilkoku.com/#organization",
        name: "İlkOku",
        url: "https://ilkoku.com/",
      },
      publisher: {
        "@type": "Organization",
        "@id": "https://ilkoku.com/#organization",
        name: "İlkOku",
        url: "https://ilkoku.com/",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: "https://ilkoku.com/" },
        { "@type": "ListItem", position: 2, name: "Yazarlar İçin", item: "https://ilkoku.com/yazarlar-icin" },
        { "@type": "ListItem", position: 3, name: categoryName, item: categoryUrl },
        { "@type": "ListItem", position: 4, name: title, item: canonicalUrl },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
    />
  );
}
