# İlkOku public access and indexability map

_Last updated: 2026-09-10_

This document is the canonical operating note for how İlkOku public routes are classified. Use this distinction in SEO, robots, sitemap, crawl, smoke-test and access-control work. Do not treat these three groups as interchangeable.

## 1. Public + Google index open

These routes are accessible without login and are intended to be indexable by search engines.

- `/`
- `/hakkimizda`
- `/nasil-calisir`
- `/editoryal-standartlar`
- `/icerik-ve-yas-politikasi`
- `/topluluk-kurallari`
- `/telif-bildirimi`
- `/yazarlar-icin`
- `/editorler-icin`
- `/yayinevleri-icin`
- `/yardim`
- `/iletisim`
- `/editorler`
- `/yasal/kullanim-sartlari`
- `/yasal/gizlilik-politikasi`
- `/yasal/kvkk`
- `/yasal/cerez-politikasi`
- `/yasal/telif-hakki-politikasi`
- Published public books under `/kitap/[slug]`

Operational rule: these pages must remain publicly fetchable, must not carry a `noindex` directive, and may be included in the sitemap when they satisfy the publication rules.

## 2. Public + Google index closed

These routes may be viewed without login, but are intentionally excluded from Google indexing for the current product phase.

- `/eserler`
- `/eserler/*`
- `/yazarlar`
- `/yazarlar/*`
- `/turler`
- `/turler/*`

Operational rule: these routes are **not password-protected**. Their exclusion from search is intentional and must not be reported as an SEO defect while this product decision remains active.

## 3. Private + login required

These areas are user-, role- or administration-specific and require authentication/authorization. They are not part of public SEO acceptance.

Examples include:

- Author workspace/dashboard
- Editor workspace/dashboard
- Publisher workspace/dashboard
- Account/profile areas
- Create/edit work flows
- Draft and unpublished work areas
- Editorial review/workbench screens
- Contract/personal transaction screens
- System administration/admin areas
- Other authenticated user-specific routes

Operational rule: these routes must stay out of public sitemap/indexability acceptance and must not be made public merely to improve crawl coverage.

## Product identity context

İlkOku is a digital publishing platform centered on the author and the work-creation journey. Authors create and publish works, readers read and give feedback, editors evaluate works, and publishers discover authors and works. It is not a news site and not merely an e-book storefront.

## Terminology to use

Use these exact meanings in future work:

- **Public + index open** = accessible without login and intended for Google indexing.
- **Public + noindex** = accessible without login but intentionally excluded from Google indexing.
- **Private + login required** = content is protected by authentication/authorization.

Do not use the word "closed" without stating which of the latter two meanings is intended.
