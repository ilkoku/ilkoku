# Book Index scheduler rollout

Status: **GITHUB_SCHEDULE_CONFIGURED / DELIVERY_DEGRADED / CANARY_PASS**

Book Index scheduler production aktivasyonu 25.09.2026 tarihinde gerçek
production canary ile doğrulandı.

## Authentication

Primary authentication is **GitHub Actions OIDC**.

Production endpoint validates:

- issuer: `https://token.actions.githubusercontent.com`
- audience: `ilkoku-book-index-scheduler`
- repository: `ilkoku/ilkoku`
- repository id: `1304046004`
- workflow ref: `ilkoku/ilkoku/.github/workflows/book-index-scheduler.yml@refs/heads/main`
- ref: `refs/heads/main`
- allowed event: `workflow_dispatch` or `schedule`

`BOOK_INDEX_SCHEDULER_SECRET` remains only as a legacy emergency fallback.

## Production canary evidence

Successful canary:

- workflow: **Book Index scheduler canary #1**
- run id: `36180534656`
- auth: GitHub OIDC
- checked lists: 12
- due lists: 12
- succeeded: 12
- unchanged: 0
- failed: 0
- skipped: 0
- items stored: 392

Per-list stored items:

- Remzi weekly: 15
- BKM weekly/monthly/yearly: 50 / 50 / 50
- KitapSepeti: 30
- Kitapzen weekly/monthly/yearly: 20 / 20 / 20
- İnkılâp: 20
- KitapSeç Edebiyat: 48
- KitapSeç Çocuk ve Gençlik: 48
- idefix: 21

The temporary `workflow_run` bootstrap trigger used for the first production
canary has been removed.

## GitHub schedule delivery status

Configured GitHub Actions schedule windows:

- primary: `17 * * * *`
- fallback: `47 * * * *`

Both windows call the same due-aware scheduler and never bypass each list's
`collectionEveryMinutes`. Scheduler execution is additionally guarded by a
cross-trigger database lease, so GitHub and an independent external trigger
cannot collect the same due window concurrently. The fallback reduces exposure to a missed primary
event, but it does **not** guarantee that GitHub will deliver either scheduled
event.

Current production evidence on 27.09.2026:

- latest natural Book Index scheduler run: **#22**, created at
  `2026-09-27T06:37:03Z`;
- no natural Book Index scheduler run #23 had been delivered by the latest
  production check after the later configured windows;
- the independent CMS publishing scheduler also stopped receiving natural
  scheduled runs after **#680**, created at `2026-09-27T06:47:23Z`;
- readiness reported overdue Book Index lists while no later natural scheduler
  event had arrived;
- `BOOK_INDEX_SCHEDULER_SECRET` was **not configured** in production readiness
  evidence.

This pattern is treated as **scheduled-event delivery degradation**, not as
proof of a Book Index collector failure. Manual scheduler runs must not be used
to manufacture history or hide delivery gaps.

Concurrency remains:

- group: `book-index-scheduler`
- `cancel-in-progress: false`

A failed or partial source run uses the shared bounded retry timing and becomes
due again after at most 30 minutes. A failed source stays isolated and does not
stop later due lists.

## Independent trigger recovery option

The production endpoint already supports a static bearer-secret fallback via
`BOOK_INDEX_SCHEDULER_SECRET`. This path is **inactive** until production
operators explicitly configure a strong secret outside the repository and an
independent scheduler (for example the hosting control plane) sends the POST.

Recovery guardrails:

1. never commit, print, log, issue-comment, or chat the secret value;
2. use at least 32 random bytes;
3. call the existing due-aware scheduler endpoint only; never create a
   force/backfill endpoint;
4. keep source cadence authoritative so an external trigger cannot create
   artificial observations;
5. keep the database scheduler lease enabled so GitHub and external triggers
   cannot enter collection concurrently;
6. verify the independent trigger with readiness/operations evidence before
   treating scheduler delivery as recovered;
7. do not enable Book Index public/SEO publication merely because trigger
   delivery is restored.

No independent external trigger is considered active until production evidence
shows it is configured and successfully invoking the endpoint.

## Next operational gate

Canary authentication and collector behavior are proven. The current operating
phase is **delivery recovery + evidence accumulation + readiness**:

1. accumulate multiple production snapshots;
2. run/verify master-book matching;
3. measure storefront coverage and independent-operator-group coverage separately;
4. measure match coverage;
5. measure first/last observation, global history span, and per-source history floor;
6. track `minimumSourceSuccessfulRunCount`, `minimumSourceHistorySpanHours`, and `leastMatureSourceCodes`;
7. measure Turkey composite item count;
8. only then set SEO policy thresholds and run the SEO gate dry-run.

## Rollback

If scheduled collection becomes unhealthy:

1. remove/disable the `schedule` trigger;
2. retain manual `workflow_dispatch`;
3. keep all historical observations and fetch runs;
4. isolate only the affected source;
5. do not bypass anti-bot/source protections.
