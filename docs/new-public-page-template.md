# New public page template

Use this checklist and code pattern when adding a new public İlkOku page. The purpose is to make a new page feel native on day one and keep SEO, social metadata and visual identity from drifting.

## Canonical sources

Before creating a new public page, use these sources instead of inventing another local convention:

- brand/visual/voice contract: `docs/public-brand-system.md`;
- SEO/content ownership: `docs/public-seo-content-governance.md`;
- route families and exceptions: `docs/public-site-route-inventory.md`;
- canonical brand metadata constants: `src/lib/public-brand.ts`;
- public navigation manifest: `src/lib/public-site-navigation.ts`;
- normal public metadata helper: `src/lib/public-page-metadata.ts`;
- normal public shell: `src/components/layout/PublicPageTemplate.tsx`.

The homepage has its own canonical SEO/social title: `İlkOku | Dijital Edebiyat Platformu – İlk cümle, ilk adım`. **Do not copy that homepage title onto every inner page.** Inner pages need a unique descriptive title, normally `Sayfa Başlığı | İlkOku`.

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

- the canonical literary-terminal public header;
- the shared back-navigation behavior;
- the canonical trust footer;
- the standard warm editorial paper surface;
- canonical/robots/Open Graph/Twitter metadata;
- the canonical İlkOku social-image fallback when no page-specific image is supplied.

## CMS-created pages

Single-level published TR pages delivered by `src/app/[...path]/page.tsx` already use the same `PublicPageTemplate` and metadata helper. A normal CMS page therefore should not need a custom public header, footer or route-specific metadata implementation.

The CMS slug guard also reserves roots owned by code-driven public routes through `publicCodeOwnedIndexRoutes`, so a generic CMS page cannot silently shadow routes such as `/eserler`, `/yazarlar`, `/turler`, `/yardim`, `/editorler` or `/iletisim`. Preview and social-image namespaces are reserved as well.

## When a custom experience is justified

A custom page experience may replace `PublicEditorialDocument` when the content genuinely needs a specialized layout (for example discovery, a role journey or a work detail). Even then:

- keep `PublicPageTemplate` or an existing route-family layout that mounts `PublicSiteFrame`;
- keep the canonical header/footer language;
- keep the brand-system color/type/motion rules;
- preserve the SEO metadata contract;
- do not create a second global navigation system.

If a new route creates a genuinely new public route family or an intentional shell/SEO exception, update `docs/public-site-route-inventory.md` in the same change.

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

Use the canonical site fallback automatically, or provide a truthful page-specific public image:

```tsx
createPublicPageMetadata({
  title,
  description,
  canonical: "/yeni-sayfa",
  image: "/public-page-visuals/yeni-sayfa.webp",
});
```

Do not create a second generic İlkOku social card in a page folder. The shared fallback is `/opengraph-image`, and Twitter/X reuses the same canonical artwork unless the page has a justified specific image.

## Before merging a new page

- [ ] Route and canonical match.
- [ ] Index/noindex is intentional.
- [ ] Title and description are unique and truthful.
- [ ] Inner-page title is descriptive; the homepage title was not copied blindly.
- [ ] Header is the shared literary-terminal header.
- [ ] Footer and internal links are canonical.
- [ ] The page is connected to the correct public navigation/internal-link graph when it should be discoverable.
- [ ] No fake data or unsupported product claims appear.
- [ ] Structured data matches visible content, if used.
- [ ] Desktop layout visually belongs to İlkOku.
- [ ] Mobile layout is checked.
- [ ] Reduced-motion/accessibility behavior remains valid.
- [ ] Lint/build/contracts pass as applicable.
- [ ] Production Smoke and SEO smoke pass after release when the public graph changes.
