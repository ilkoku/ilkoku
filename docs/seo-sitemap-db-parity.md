# SEO sitemap / production DB parity

The public sitemap may intentionally return static pages when CMS or DB queries fail. A successful XML fetch alone therefore cannot prove eligible published books are present.

The private endpoint authenticates the exact GitHub OIDC identity and reads only public-work slugs and published Turkish CMS page slugs, matching production sitemap eligibility. The GitHub audit independently downloads live XML and reports missing or unexpectedly listed works, missing CMS routes, duplicates and gated Book Index leaks.

The audit runs once after a successful main-branch Production Smoke (and on explicit manual dispatch). It makes only two external GET requests and a single bounded database inventory read; there is no hourly scan, load test, DB write or Google indexing request.

Failure may mean different deployment versions, cache state, DB outage, a policy mismatch or static sitemap fallback. Do not delete pages or redirect URLs automatically.

Passing this check is not evidence of Google indexing. The Google Search Console URL Inspection census remains separate.