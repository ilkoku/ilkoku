# İlkOku — independent hourly email-operations scheduler

## Why this exists

The GitHub Actions `Email operations` workflow is nominally hourly (minute 35),
but actual scheduled runs have had multi-hour gaps. GitHub officially warns
that scheduled runs can be delayed or dropped. This independent **Cloudflare
Worker Cron Trigger** runs at minute 12 (UTC), calls the already-existing
authenticated `POST /api/internal/email-operations`, and reports errors through
Cloudflare Worker logs. The existing GitHub action stays enabled at minute 35.

This is a **scheduler only**, not an email sender. The endpoint checks failed
and pending deliveries, expires stalled pending deliveries, removes old
deduplication tokens and notifies in-app administrators on failure thresholds.
It does not retry failed outgoing messages automatically.

## Deployment (requires Cloudflare account access)

*Do not put secrets in chat, commit them, or add them to `wrangler.toml`.*

1. Verify that production `EMAIL_OPERATIONS_SECRET` is configured and
   corresponds to the secret available to the GitHub email-operations workflow.
   If GitHub uses the `WRITER_DAILY_SUMMARY_SECRET` fallback, use that same
   production value. Do not rotate credentials as part of this rollout.
2. From repository root, with the appropriate Cloudflare account logged in:

   ```sh
   npx --yes wrangler@4.151.0 deploy --config workers/ilkoku-email-ops-cron/wrangler.toml
   npx --yes wrangler@4.151.0 secret put EMAIL_OPERATIONS_SECRET --config workers/ilkoku-email-ops-cron/wrangler.toml
   ```

   Enter the already-configured production secret at Wrangler's **local**
   prompt. Do not paste the secret in chat or shell history. The Worker fails
   closed until its secret is set. Cron trigger propagation can take time.
3. In Cloudflare Workers & Pages, select `ilkoku-email-ops-cron`; check
   **Settings > Triggers > Cron Triggers** for `12 * * * *` and
   **Observability > Logs** for `EMAIL_OPERATIONS_CRON_OK`. Validate **two
   consecutive hourly executions** and successful HTTP results. Confirm
   the Email Operations page continues to show no new errors or stalled
   pending records.
4. Keep `.github/workflows/email-operations.yml` enabled as a separate
   fallback. Only report the hourly schedule as verified after actual hourly
   Cloudflare runs are observed. No DNS, Hostinger or existing GTM Worker
   change is required.

## Safety boundaries

- No HTTP fetch handler, DNS route, Worker URL or public credentials.
- Only sends a POST to a hardcoded endpoint with the locally configured
  Cloudflare secret; does not send email itself.
- Fails on missing/short secrets, non-2xx responses, invalid JSON or a result
  without `ok: true` and an ISO-compatible `checkedAt`.
- Logs aggregate counts only, without recipients or message content.
- Do not disable the GitHub fallback until stable independent operation
  is confirmed. Even two schedulers cannot guarantee precisely-on-the-hour
  execution during provider outages; alerting/heartbeat is a separate task.

## Source verification

```sh
node --test scripts/security-contract-email-operations-cron.test.mjs
```
