# New public page template

Use this checklist and code pattern when adding a new public İlkOku page. The purpose is to make a new page feel native on day one.

## Preferred shell

```tsx
import type { Metadata } from "next";

import { PublicEditorialDocument } from "@/components/content/PublicEditorialDocument";
import { PublicPageTemplate } from "@/components/layout/PublicPageTemplate";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Sayfa Başlığı | İlkOku",
  description: "Sayfanın gerçek ve kısa açıklaması.",
  canonical: "/yeni-sayfa",
});

export default function NewPublicPage() {
  return (
    <PublicPageTemplate>
      <PublicEditorialDocument
        eyebrow="İlkOku"
        title="Sayfa Başlığı"
        summary="Kısa, gerçek ve kullanıcıya ne bulacağını söyleyen özet."
        body={`## İlk bölüm\n\nİçerik...`}
        backHref="/"
        backLabel="Ana sayfa"
      />
    </PublicPageTemplate>
  );
}
```

This gives the page:

- the canonical public header;
- the shared back-navigation behavior;
- the canonical trust footer;
- the standard editorial paper surface;
- canonical/robots/Open Graph/Twitter metadata.

## CMS-created pages

Single-level published TR pages delivered by `src/app/[...path]/page.tsx` already use the same `PublicPageTemplate` and metadata helper. A normal CMS page therefore should not need a custom public header or a custom footer.

## When a custom experience is justified

A custom page experience may replace `PublicEditorialDocument` when the content genuinely needs a specialized layout (for example discovery, a role journey or a work detail). Even then:

- keep `PublicPageTemplate` or an existing route-family layout that mounts `PublicSiteFrame`;
- keep the canonical header/footer language;
- keep the brand-system color/type/motion rules;
- preserve the SEO metadata contract;
- do not create a second global navigation system.

## Indexability decision

For a normal public landing page:

```tsx
createPublicPageMetadata({
  title,
  description,
  canonical: "/yeni-sayfa",
});
```

For a deliberately non-indexable page:

```tsx
createPublicPageMetadata({
  title,
  description,
  canonical: "/ozel-sayfa",
  noIndex: true,
});
```

Do not use `noIndex` to hide accidental design or content problems.

## Social image

Use the site fallback automatically, or provide a truthful page-specific public image:

```tsx
createPublicPageMetadata({
  title,
  description,
  canonical: "/yeni-sayfa",
  image: "/public-page-visuals/yeni-sayfa.webp",
});
```

## Before merging a new page

- [ ] Route and canonical match.
- [ ] Index/noindex is intentional.
- [ ] Title and description are unique and truthful.
- [ ] Header is the shared literary-terminal header.
- [ ] Footer and internal links are canonical.
- [ ] No fake data or unsupported product claims appear.
- [ ] Structured data matches visible content, if used.
- [ ] Desktop layout visually belongs to İlkOku.
- [ ] Mobile layout is checked.
- [ ] Reduced-motion/accessibility behavior remains valid.
- [ ] Lint/build/contracts pass as applicable.
- [ ] Production Smoke and SEO smoke pass after release.
