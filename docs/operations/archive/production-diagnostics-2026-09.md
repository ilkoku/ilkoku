# Archived production diagnostics — September 2026

Status: **ARCHIVED / not an active runbook**

Baseline before archival: `619c47fe53357a4731222afc7e4a3b76ff04b4de`

The following GitHub Actions workflows were created for a bounded Hostinger/Cloudflare capacity and WAF investigation. They are no longer part of the normal İlkOku operating model and were removed from the active `.github/workflows` surface to avoid accidental production stress runs and reduce operator noise:

- `hostinger-origin-direct-load-test.yml`
- `hostinger-preview-load-test.yml`
- `hostinger-support-stress.yml`
- `hostinger-waf-allowlist-diagnostic.yml`
- `hostinger-waf-allowlist-stress.yml`
- `distributed-public-load-test.yml`

## Historical purpose

These workflows were used to distinguish origin capacity, Cloudflare edge behavior, Hostinger anti-bot/rate-limiting behavior, and distributed runner effects during the September 2026 infrastructure investigation.

## Retrieval

The exact workflow definitions remain recoverable from Git history at the baseline commit above. They must not be restored to the active Actions surface without a new explicit operational decision, a current safety review, and production-impact confirmation.

## Current canonical tools

Normal operations keep the low-impact production smoke and the manually confirmed SEO/Googlebot diagnostics. The standard public load test remains the canonical controlled load-testing entry point when capacity testing is explicitly required.
