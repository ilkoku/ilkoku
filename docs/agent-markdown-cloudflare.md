# Homepage Markdown negotiation — Cloudflare Free, controlled rollout

Status: proposed; do not mark requirement 6 complete until the live proof succeeds. No Worker, subscription upgrade, application rewrite or auth proxy change. The current public representation at /agent/home.md is a curated summary, not an exhaustive conversion of all HTML.

## Preflight

- Existing root HTML remains unchanged. As inspected 2026-11-27 the sole active cache rule was scoped to /en-cok-satanlar/dunya; do not edit it or the GTM Worker or email-obfuscation rule.
- Review existing rewrite and response transform rules and quota before saving. Do not change WAF.
- Preserve original Next.js Vary tokens (RSC and router variants). Do not use Set static to replace Vary.
- Use exact single explicit Accept: text/markdown only. This intentionally does not implement all weighted or mixed Accept preferences. q=0 and normal browser requests remain HTML.

## Rules (deploy in this order; first cache safety and response Vary, then rewrite)

1. Cache Rule: name `ilkoku-agent-markdown-no-cache`
   expression:
   ```
   (http.host eq "ilkoku.com" and http.request.uri.path eq "/agent/home.md")
   ```
   Cache eligibility: Bypass cache. No TTL override. Applies to rewritten path as well as direct Markdown requests. Do not alter existing HTML caching.

2. Response Header Transform: name `ilkoku-root-vary-accept`
   expression:
   ```
   (http.host eq "ilkoku.com" and raw.http.request.uri.path eq "/")
   ```
   Add static header (NOT Set): Vary = Accept. The HTTP field is list-valued; preserve all existing Vary tokens. Verify normal root HTML still has its original RSC variants.

3. URL Rewrite: name `ilkoku-root-explicit-markdown`
   expression:
   ```
   (http.host eq "ilkoku.com" and http.request.uri.path eq "/" and http.request.uri.query eq "" and http.request.method in {"GET" "HEAD"} and all(http.request.headers["accept"][*] eq "text/markdown") and any(http.request.headers["accept"][*] eq "text/markdown") and not any(http.request.headers.names[*] eq "rsc") and not any(http.request.headers.names[*] eq "next-router-state-tree") and not any(http.request.headers.names[*] eq "next-router-prefetch") and not any(http.request.headers.names[*] eq "next-router-segment-prefetch") and not any(http.request.headers.names[*] eq "authorization") and not any(http.request.headers.names[*] eq "cookie"))
   ```
   Static Path rewrite to /agent/home.md. Leave query unchanged. Only the exact root, anonymous explicit Markdown GET/HEAD; never rewrite private pages, cookies, application navigations or HTML requests. No redirect. If the plan/editor refuses the expression, leave it disabled; do not loosen conditions without review.

## Acceptance

Run `node scripts/agent-markdown-live-proof.mjs` from an authorized network or use the manual workflow. This tests HTML before and after Markdown; strict Markdown content type/body, no-store, Vary: Accept on both, original RSC token, HEAD, mixed and q=0 preferences, query and private/auth entry unaffected. No cache pollution, no redirects, no private content requests, no repeated retries.

Rollback: disable the URL Rewrite first, then the two new safety rules if needed. Leave all previously-existing rules unchanged. Verify plain HTML and /agent/home.md again. Do not purge the entire zone.

Official references: https://developers.cloudflare.com/rules/transform/url-rewrite/ ; https://developers.cloudflare.com/rules/transform/response-header-modification/ ; https://developers.cloudflare.com/rules/reference/troubleshooting/ ; https://developers.cloudflare.com/cache/how-to/cache-rules/
