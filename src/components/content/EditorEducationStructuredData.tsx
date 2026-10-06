const siteUrl = "https://ilkoku.com";

type EditorEducationStructuredDataProps = {
  title: string;
  description: string;
  canonical: string;
};

function absoluteUrl(value: string) {
  if (/^https:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${siteUrl}${path}`;
}

export function EditorEducationStructuredData({
  title,
  description,
  canonical,
}: EditorEducationStructuredDataProps) {
  const pageUrl = absoluteUrl(canonical);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      inLanguage: "tr-TR",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
      author: {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "İlkOku",
        url: siteUrl,
      },
      publisher: {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "İlkOku",
        url: siteUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Ana Sayfa",
          item: `${siteUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Editörler İçin",
          item: `${siteUrl}/editorler-icin`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: title,
          item: pageUrl,
        },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
