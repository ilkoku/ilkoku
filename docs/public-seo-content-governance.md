# İlkOku public SEO and content governance

This document defines how public content, SEO fields and indexability are owned and released. The goal is one canonical content source, one public identity and one truthful search graph.

## 1. Ownership model

- CMS/public content editors own page copy and page-level SEO fields.
- `/icerik/seo` is a diagnostic and routing workbench, not a second write source.
- Published public delivery reads only published CMS state.
- A read failure must never be presented as a falsely clean SEO state.
- The application/workspace layer is not part of the public SEO surface unless a route is intentionally public and indexable.

## 2. Current language scope

The public SEO baseline is Turkish-first/TR-only until another locale is explicitly enabled through the locale system and receives its own complete canonical/hreflang/indexability contract.

Do not create partial public language variants simply to gain index coverage.

## 3. Required metadata for every public page

Every indexable public page must define or inherit:

- a unique, human-readable title;
- a useful meta description;
- one canonical URL;
- an explicit robots decision;
- Open Graph title, description, URL and image;
- Twitter large-image metadata;
- the correct Turkish locale context;
- a social-image fallback when no page-specific image exists.

Use `createPublicPageMetadata` for new conventional public pages unless the route has a justified specialized metadata model (for example a profile or work detail page).

## 4. Canonical and robots rules

- Canonical must describe the real preferred public URL, not a preview or editor URL.
- `noindex` is an intentional state, not an error-recovery shortcut.
- Filter/search/query variants should only be indexable when they represent a deliberate canonical landing page.
- Preview, archive, admin, CMS, authentication and workspace routes must not become public index targets by accident.
- Redirect-only legacy paths must not appear as canonical navigation or sitemap destinations.

## 5. Sitemap rules

The sitemap is a public truth graph, not a route dump.

Include only:

- canonical public landing pages;
- published/public works that pass the publication boundary;
- public author/genre/detail surfaces that pass their visibility rules;
- canonical legal pages that are not intentionally `noindex`.

Exclude drafts, private works, archived content, blocked fixtures, editor/admin/CMS routes and hidden legacy previews.

## 6. Internal linking

Every important indexable public page should be reachable through the public information architecture.

Primary families are:

- homepage and discovery (`/`, works, authors, genres, editors);
- Platform pages;
- Güven & Standartlar pages;
- Help/contact;
- legal pages.

Footer links, contextual related links and page-level navigation must point to real canonical destinations. Do not use dead anchors or retired guide routes as permanent navigation.

## 7. Structured data

Use structured data only when the visible page genuinely supports it.

Examples:

- `WebPage` for public trust/editorial pages;
- `BreadcrumbList` where a meaningful hierarchy is visible;
- `FAQPage` only for actually published/visible FAQs;
- `ItemList`, profile or work/book schema only when the page content matches the schema.

Never add schema solely to target rich results when the underlying visible content does not support it.

## 8. Content truth rules

Public copy must not invent:

- user/readership numbers;
- publisher participation;
- review guarantees;
- approval/verification states;
- automated moderation or AI capabilities;
- contractual, legal or privacy guarantees beyond implemented policy.

Where the product state is conditional, use conditional language.

## 9. New public page lifecycle

Before implementation:

1. Define the user purpose and public route.
2. Decide whether the page is CMS-managed or code-driven.
3. Decide index/noindex and canonical intent.
4. Define its place in Platform, Güven & Standartlar, discovery, help or legal IA.

During implementation:

5. Use `PublicPageTemplate` / `PublicSiteFrame` rather than inventing another global header.
6. Use `createPublicPageMetadata` for the normal website metadata contract.
7. Use the established İlkOku brand system and public footer.
8. Add truthful structured data only where justified.
9. Add sitemap/internal links if the page is meant to be discoverable.

Before release:

10. Verify title, description, canonical, robots, OG/Twitter and social image.
11. Verify no preview/admin/CMS links leak into the public page.
12. Run lint, relevant security contracts and production build.
13. Run Production Smoke and SEO/indexability smoke when the route changes the public graph.
14. Perform human desktop/mobile visual QA.

## 10. Content-management workflow

For CMS-owned public content use the existing lifecycle and canonical editor path. Draft/preview/publish remain separate states. A preview must never become the public canonical just because it visually looks finished.

SEO diagnostics may point the editor to a problem, but fixes should be made at the canonical page/content editor so there is one source of truth.

## 11. Release reporting

Do not describe a CI job as fully passing when an independent gate failed. Report individual results accurately (for example lint/build/smoke pass while a dependency audit is blocked). Existing infrastructure/dependency debt must be distinguished from regressions introduced by the current page change.
