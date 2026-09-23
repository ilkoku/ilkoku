# İlkOku public route inventory

This inventory records which route families belong to the public brand/SEO surface and which intentionally remain application/contextual surfaces.

## Gated-product SEO rule

İlkOku is an authenticated product with a public marketing/trust surface. Search engines should index only pages that are intentionally public and useful without a signed-in session.

- Authenticated workspaces, account flows, admin/CMS surfaces and other operational routes stay outside search through authentication plus `X-Robots-Tag: noindex, nofollow, noarchive`.
- A route is not added to the sitemap merely because code for that route exists.
- Public discovery is active only for published, active and public content; drafts, private works, archived content and blocked fixtures remain outside search.
- Published public work pages under `/kitap/[slug]` are indexable only when the work itself satisfies public publication/privacy rules.
- Discovery hubs and their canonical detail pages are part of the crawl graph and sitemap so search engines can reach works, authors and genres through normal HTML links as well as XML discovery.

## Canonical public routes

| Route family | Public shell | SEO/index intent |
| --- | --- | --- |
| `/` | canonical homepage header + homepage footer | indexable canonical homepage |
| `/editorler` | `PublicSiteFrame` via route layout | indexable public editor directory |
| `/editorler/[slug]` | inherited `/editorler` layout | public profile surface |
| `/yardim` | `PublicSiteFrame` via route layout | indexable help surface |
| `/iletisim` | `PublicSiteFrame` via route layout | indexable contact surface |

## Active public discovery routes

These route families are part of the public SEO surface. They expose only published, active and public content and provide canonical HTML links between discovery hubs and detail pages.

| Route family | Current behavior | SEO/index intent |
| --- | --- | --- |
| `/eserler` | public work library | indexable canonical hub |
| `/eserler/yeni` | newest public works feed | indexable canonical hub; filtered/paginated variants noindex |
| `/eserler/guncellenen` | recently updated public works feed | indexable canonical hub; filtered/paginated variants noindex |
| `/eserler/rss.xml` | public discovery feed | feed discovery surface |
| `/yazarlar` | public author directory | indexable canonical hub |
| `/yazarlar/[publicId]` | public author profile for authors with discoverable work | indexable canonical detail |
| `/turler` | public genre directory | indexable canonical hub |
| `/turler/[slug]` | public genre page backed by discoverable work | indexable canonical detail |

## Platform pages

All use the canonical public frame/header and are indexable when published/index-enabled.

- `/hakkimizda`
- `/nasil-calisir`
- `/yazarlar-icin`
- `/editorler-icin`
- `/yayinevleri-icin`

## Güven & Standartlar pages

All use the canonical public frame/header and are indexable when published/index-enabled.

- `/editoryal-standartlar`
- `/icerik-ve-yas-politikasi`
- `/topluluk-kurallari`
- `/telif-bildirimi`

## Legal pages

`/yasal/[slug]` is wrapped by the canonical `PublicSiteFrame`; the previous local legal header is retired inside that frame.

Canonical legal destinations:

- `/yasal/kullanim-sartlari`
- `/yasal/gizlilik-politikasi`
- `/yasal/kvkk`
- `/yasal/cerez-politikasi`
- `/yasal/telif-hakki-politikasi`

## Future CMS public pages

Published single-level Turkish CMS pages delivered by `src/app/[...path]/page.tsx` use `PublicPageTemplate`.

They therefore inherit:

- `PublicSiteFrame`;
- canonical literary-terminal header;
- shared back-navigation behavior;
- canonical trust footer;
- the generic editorial paper surface;
- `createPublicPageMetadata` for the normal SEO contract.

A CMS page should enter search only after it is intentionally published and index-enabled. Creating a draft or route alone is not approval to add it to search.

## Specialized public content surface

`/kitap/[slug]` is a public, indexable work-detail surface with specialized `Book`/breadcrumb metadata and the `BookShowcase` experience. Its showcase top bar is a contextual reading/back tool rather than a second global marketing header.

Do not casually replace specialized work metadata with generic website metadata; work/publication safety and adult-content indexability rules are route-specific.

## Deliberately separate application surfaces

These are not governed by the public marketing header because they are operational/authenticated interfaces and must remain non-indexable:

- `/admin/*`
- `/icerik/*`
- writer workspace routes (`/yazar`, `/eserlerim`, etc.)
- editor workspace routes (`/editor/*`)
- publisher workspace routes (`/yayinevi/*`, authenticated `/yayinevleri` workflow)
- account/authentication/role-selection flows where operational navigation is appropriate.

The separation is intentional: public brand identity stays coherent without exposing private application state to search engines.

## Hidden/preview routes

Preview and archived homepage routes are not canonical public destinations and must remain outside sitemap/navigation/indexing.

- `/onizleme/ana-sayfa-eski` — preserved legacy homepage archive, noindex/unlinked.
- `/onizleme/ana-sayfa-yeni` — retired preview path; canonical experience is `/`.

## Maintenance rule

When a new public route is introduced, update this inventory if it creates a new route family or an intentional shell/SEO exception. If the route is a normal informational CMS page, no new identity system should be created: use the existing template. Do not add unfinished or authenticated-only routes to sitemap/search merely to increase URL count.
