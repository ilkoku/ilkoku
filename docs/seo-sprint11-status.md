# Sprint 11 SEO status

Current active scope: Turkish public İlkOku only.

Completed foundations:
- TR role cards are audited as homepage on-page SEO signals.
- TR role cards are server-rendered from canonical published CMS state.
- TR homepage CMS body content is server-rendered from canonical published state.
- Global Open Graph / Twitter fallback artwork exists.
- Core public sitemap fallback keeps all 23 code-owned public URLs visible during temporary CMS/database failures.
- IndexNow ownership and automatic production URL submission are enabled.
- Production SEO indexability smoke verifies sitemap, robots, canonical, title, description, structured data and public noindex safety.
- WebSite and Organization structured data are linked for brand/entity discovery.

Remaining external indexing step:
- The repository now includes a manual + weekly **GSC URL Inspection diagnostic** workflow backed by Google's official Search Console URL Inspection API.
- It is diagnostic-only: it reads the version currently known to Google's index and **does not request indexing** or mutate Search Console state.
- OAuth must be provisioned with the read-only scope `https://www.googleapis.com/auth/webmasters.readonly`.
- Required GitHub Actions secrets: `GSC_OAUTH_CLIENT_ID`, `GSC_OAUTH_CLIENT_SECRET`, and `GSC_OAUTH_REFRESH_TOKEN`.
- The default cohort checks the homepage, `/nasil-calisir`, `/yazarlar-icin`, the Roman writing guide, the first public `/kitap/` URL discoverable from the live sitemap, and any Book Index URLs that are actually published in the live sitemap.
- The weekly diagnostic runs Tuesday 08:23 Türkiye time (05:23 UTC), remains read-only, and never adds gated Book Index URLs that are absent from the sitemap.
- A separate weekly **Book Index GSC performance** report runs Tuesday 08:45 Türkiye time (05:45 UTC), after the inspection diagnostic. It compares the latest finalized 28-day Search period with the previous 28 days and reports clicks, impressions, CTR, average position, plus the top Book Index page/query rows.
- The performance report filters the Search Analytics API to `/en-cok-satanlar*`, uses finalized data with a three-day reporting lag, and treats zero rows as a valid state while the Book Index is gated or newly published.
- Sitemap submission remains the bulk discovery path. Any manual Search Console "Request indexing" action remains a separate human operation.

Final production UAT #263 remains deferred until the end.
