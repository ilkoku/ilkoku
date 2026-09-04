# İlkOku Site System

This is the canonical starting point for public-site work. Use it before changing a public page, header, footer, SEO metadata, social identity or CMS page behavior.

The purpose is simple: **one site, one identity, one content/SEO model, one page-production system.**

## 1. Public identity

İlkOku is a literary/editorial platform expressed through the combined visual language of **book + archive + digital terminal**.

Canonical identity values are defined in `src/lib/public-brand.ts` and explained in `docs/public-brand-system.md`.

- Brand: `İlkOku`
- Positioning: `Dijital Edebiyat Platformu`
- Editorial slogan: `İlk cümle, ilk okurun, ilk adımın.`
- Homepage/social title: `İlkOku | Dijital Edebiyat Platformu – İlk cümle, ilk adım`
- Header signature: logo + `> DİJİTAL EDEBİYAT PLATFORMU_` + `> GİRİŞ YAP_` / `> HESABIM_`

Do not create a second public visual language for a new page.

## 2. Source-of-truth map

| Concern | Canonical source |
| --- | --- |
| Brand constants / homepage social identity | `src/lib/public-brand.ts` |
| Visual, emotional and voice contract | `docs/public-brand-system.md` |
| Public header/frame | `PublicSiteHeader`, `PublicSiteFrame` |
| Normal new-page shell | `PublicPageTemplate` |
| Normal editorial content surface | `PublicEditorialDocument` |
| Public metadata factory | `createPublicPageMetadata` |
| Public navigation/footer links | `src/lib/public-site-navigation.ts` |
| Code-owned SEO route inventory | `src/lib/public-seo-routes.ts` |
| Nine core CMS public pages | `src/lib/public-cms-page-catalog.ts` |
| Route families and exceptions | `docs/public-site-route-inventory.md` |
| SEO/content ownership and release rules | `docs/public-seo-content-governance.md` |
| Copy-paste starter for a new public page | `docs/new-public-page-template.md` |
| Exact homepage/social-title note | `docs/seo-social-brand-title.md` |

If two files disagree, fix the duplication; do not create a third version.

## 3. Public page families

### Standard informational page

Use `PublicPageTemplate` + `PublicEditorialDocument` + `createPublicPageMetadata`.

This is the default for a new public informational/CMS page.

### Specialized public experience

Discovery, profiles, work/book pages or a deliberately custom journey may use their existing specialized route-family layout and metadata. They still inherit the public identity contract unless a documented exception exists.

### Application/workspace page

Admin, CMS, writer/editor/publisher workspaces and task-focused account flows keep operational navigation. Do not force the public marketing header into application surfaces.

## 4. SEO/content model

Every indexable public page must have or inherit:

- unique title;
- truthful description;
- canonical URL;
- explicit robots/index decision;
- Open Graph metadata;
- Twitter/X metadata;
- canonical social image fallback;
- correct internal-link placement;
- sitemap presence when intended to be discoverable;
- structured data only when visible content supports it.

The homepage uses the canonical homepage/social title. Inner pages normally use `Sayfa Başlığı | İlkOku` or another unique, descriptive equivalent.

CMS editors own CMS page copy and page-level SEO fields. `/icerik/seo` diagnoses; it is not a second content source.

## 5. CMS page safety

The nine core public CMS pages are defined in `publicCmsPageCatalog` and include Hakkımızda plus the trust/role pages.

Generic CMS pages automatically inherit the standard public shell and metadata behavior. Their slug cannot shadow code-owned public roots such as works, authors, genres, editors, help/contact, preview or social-image namespaces.

A CMS read failure must never be presented as a clean/empty state.

## 6. New-page workflow

1. Define purpose and route.
2. Decide CMS-managed vs code-driven.
3. Decide index/noindex and canonical intent.
4. Place the page in the correct public information architecture.
5. Start from `docs/new-public-page-template.md`.
6. Use the existing header/frame/footer; do not redesign global identity locally.
7. Add unique page copy and SEO fields.
8. Add structured data only if justified.
9. Add navigation/sitemap coverage if discoverable.
10. Run lint, relevant contracts and production build.
11. Run Production Smoke; run SEO/indexability smoke when the public graph changes.
12. Perform human desktop/mobile visual QA.

## 7. Global-change workflow

When changing the logo/header/footer, homepage title, social identity or a public navigation family:

- change the canonical source first;
- update dependent contracts/docs in the same PR;
- do not patch individual pages with duplicate constants;
- verify homepage + representative Platform + Trust + discovery + legal pages;
- verify mobile behavior;
- verify social metadata and indexability after deployment.

## 8. Visual do / do-not

### Do

- warm paper/cream content surfaces;
- deep plum/near-black cover surfaces;
- İlkOku violet accents;
- editorial serif hierarchy;
- readable UI sans-serif;
- monospace only for intentional terminal/system accents;
- restrained book/page depth;
- truthful literary imagery and real discovery content.

### Do not

- generic SaaS dashboard cards as the public identity;
- neon-green hacker/Matrix styling;
- cold cyan/blue technology branding unrelated to İlkOku;
- a second global header;
- fake counts, fake publishers or unsupported guarantees;
- custom per-page social branding when the shared fallback is sufficient.

## 9. Definition of done for the public site system

A change is complete only when code, content, SEO and visual identity agree. A green-looking page is not enough if canonical/indexability/social metadata are wrong, and a technically correct route is not enough if it visually leaves the İlkOku world.

Report CI truthfully: distinguish lint/build/smoke success from independent dependency or infrastructure gates that remain blocked.
