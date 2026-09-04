# İlkOku public route inventory

This inventory records which route families belong to the public brand/SEO surface and which intentionally remain application/contextual surfaces.

## Canonical public landing and discovery routes

| Route family | Public shell | SEO/index intent |
| --- | --- | --- |
| `/` | canonical homepage header + homepage footer | indexable canonical homepage |
| `/eserler` | `PublicSiteFrame` via route layout | indexable discovery |
| `/eserler/yeni` | inherited `/eserler` layout | indexable discovery |
| `/eserler/guncellenen` | inherited `/eserler` layout | indexable discovery |
| `/yazarlar` | `PublicSiteFrame` via route layout | indexable discovery |
| `/yazarlar/[publicId]` | inherited `/yazarlar` layout | indexable when public boundary permits |
| `/turler` | `PublicSiteFrame` via route layout | indexable discovery |
| `/turler/[slug]` | inherited `/turler` layout | indexable when public boundary permits |
| `/editorler` | `PublicSiteFrame` via route layout | indexable directory |
| `/editorler/[slug]` | inherited `/editorler` layout | public profile surface |
| `/yardim` | `PublicSiteFrame` via route layout | indexable help surface |
| `/iletisim` | `PublicSiteFrame` via route layout | indexable contact surface |

## Platform pages

All use the canonical public frame/header.

- `/hakkimizda`
- `/nasil-calisir`
- `/yazarlar-icin`
- `/editorler-icin`
- `/yayinevleri-icin`

## Güven & Standartlar pages

All use the canonical public frame/header.

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

This is the default route for a new informational public page unless a specialized page experience is justified.

## Specialized public content surface

`/kitap/[slug]` is a public, indexable work-detail surface with specialized `Book`/breadcrumb metadata and the `BookShowcase` experience. Its showcase top bar is a contextual reading/back tool rather than a second global marketing header.

Do not casually replace specialized work metadata with generic website metadata; work/publication safety and adult-content indexability rules are route-specific.

## Deliberately separate application surfaces

These are not governed by the public marketing header because they are operational/authenticated interfaces:

- `/admin/*`
- `/icerik/*`
- writer workspace routes (`/yazar`, `/eserlerim`, etc.)
- editor workspace routes (`/editor/*`)
- publisher workspace routes (`/yayinevi/*`, authenticated `/yayinevleri` workflow)
- account/authentication/role-selection flows where operational navigation is appropriate.

The separation is intentional: public brand identity stays coherent without forcing a marketing header into task-focused application screens.

## Hidden/preview routes

Preview and archived homepage routes are not canonical public destinations and must remain outside sitemap/navigation/indexing.

- `/onizleme/ana-sayfa-eski` — preserved legacy homepage archive, noindex/unlinked.
- `/onizleme/ana-sayfa-yeni` — retired preview path; canonical experience is `/`.

## Maintenance rule

When a new public route is introduced, update this inventory if it creates a new route family or an intentional shell/SEO exception. If the route is a normal informational CMS page, no new identity system should be created: use the existing template.
