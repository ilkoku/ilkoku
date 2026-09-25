# Book Index scheduler rollout

Status: **AUTOMATIC_CRON_ENABLED / CANARY_PASS**

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

## Automatic scheduler

Active GitHub Actions schedule:

`17 * * * *`

This means the scheduler checks due state hourly. It does **not** mean every
source is fetched hourly. Each list's `collectionEveryMinutes` remains the
authoritative collection cadence.

Concurrency remains:

- group: `book-index-scheduler`
- `cancel-in-progress: false`

A failed source stays isolated and does not stop later due lists.

## Next operational gate

Scheduler activation is complete. The next phase is evidence accumulation and
readiness:

1. accumulate multiple production snapshots;
2. run/verify master-book matching;
3. measure composite-source coverage;
4. measure match coverage;
5. measure first/last observation and history span;
6. measure Turkey composite item count;
7. only then set SEO policy thresholds and run the SEO gate dry-run.

## Rollback

If scheduled collection becomes unhealthy:

1. remove/disable the `schedule` trigger;
2. retain manual `workflow_dispatch`;
3. keep all historical observations and fetch runs;
4. isolate only the affected source;
5. do not bypass anti-bot/source protections.
