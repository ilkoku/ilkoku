# İlkOku — Cloudflare secret-file probe mitigation candidate (NOT ACTIVE)

Incident: https://github.com/ilkoku/ilkoku/issues/1856

This is a **version-controlled, offline-reviewed candidate**, not a running Cloudflare custom WAF rule. Repository code, CI, and deployment workflows do **not** enable it. Preserve the existing live **Block CMS Probe Paths** rule.

The proposed expression is in `docs/security/cloudflare-secret-probe-waf.expr`. Use Cloudflare WAF Custom Rules **Expression Editor** to validate syntax *without activation*, only after checking the current app routes. The comparison operators and the case-folding function are described at:
- https://developers.cloudflare.com/ruleset-engine/rules-language/operators/
- https://developers.cloudflare.com/ruleset-engine/rules-language/functions/

## Incident evidence and limits

- 20 Oct 14:47–14:48 UTC: 227 scanner-like requests and 48 **origin HTTP 503** responses.
- 23 Oct 08:03–08:04 UTC: 309 edge requests, 13 edge 5xx and 64 aggregated failed-origin connections, with 50%-sampled dimensions. These counts must **not** be mapped 1:1.
- 25 Oct 16:17–16:18 UTC and 18:18–18:19 UTC: separate scanner bursts, 14 edge 5xx each, and 14 aggregated failed-origin connections each. Exact HTTP-code/Ray mapping is still unknown.
- Separate 23 Oct synthetic-probe 520/525 cases remain unresolved and must not be relabeled as scanner-caused. Scanner coincidence is not TLS/proxy causation proof.

The candidate narrowly matches secret/config-file probes (/.env, /.docker, /.git, /.aws, private keys, secrets.json, appsettings.Development.json and .auto.tfvars). It does **not** block /admin, /api, /builds, /org/settings, /settings/tokens, /api-keys, IP/ASN/country ranges or public application paths. Some suspicious-looking paths intentionally remain outside the conservative expression.

## Promotion checklist — independent permission required

1. Review Security Events, actual routes and Free-plan rule capacity. Do **not** edit or delete the currently active CMS rule.
2. Validate the candidate in Cloudflare's own expression editor **without saving/activating**. Run the positive/negative examples in the version-controlled runtime-origin health contract; inspect URI normalization and encoded-path variants (offline tests cannot establish live parser behavior).
3. Obtain **separate explicit authorization** for Block/Managed Challenge activation, record the prior state and the exact rollback action. A passive Log-only mode may be unavailable on Free plans.
4. If activated with authorization, inspect Security Events, Ray samples and routes /, /kesfet, /kitap/*, /satinal/*, /api/build-info, auth and sitemap; revert promptly upon legitimate matches.
5. Maintain issue #1856 OPEN until Hostinger's 443/TLS/LB/gateway or HTTP 503 issuer records and subsequent monitoring demonstrate a root cause and the actual effect of mitigation.

This rule is **not a proven fix for 503/520/521/522/525**; it is only a candidate for limiting selected scanner requests. **No live traffic, WAF, DNS, TLS, server, or payment configuration is changed by these files.**
