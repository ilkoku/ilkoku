# Book Index scheduler rollout

Status: **AUTOMATIC_CRON_DISABLED / OIDC_CANARY_READY**

The Book Index scheduler keeps its protected internal-job boundary, but GitHub
Actions authentication now prefers GitHub OIDC instead of a duplicated static
secret pair.

## Runtime behavior

- Only enabled lists with a `collectionEveryMinutes` value are considered.
- The last fetch-run start time is the cadence boundary.
- Due lists execute sequentially and failures stay isolated per list.
- Collector fetch runs and observations remain append-only history.
- Blocked/paused sources are not forced into collection.

## Authentication

Primary path: **GitHub Actions OIDC**.

The scheduler workflow requests a short-lived token with:

- issuer: `https://token.actions.githubusercontent.com`
- audience: `ilkoku-book-index-scheduler`
- repository: `ilkoku/ilkoku`
- repository id: `1304046004`
- workflow ref: `ilkoku/ilkoku/.github/workflows/book-index-scheduler.yml@refs/heads/main`
- ref: `refs/heads/main`
- allowed events: `workflow_dispatch`, temporary `workflow_run` canary, and
  final `schedule`.

The production endpoint verifies GitHub's signed token through its public JWKS.
No GitHub Actions repository secret is required for the primary path.

`BOOK_INDEX_SCHEDULER_SECRET` remains only as a legacy emergency fallback.
If used, it must still be unique, at least 32 random bytes, and identical in
GitHub Actions and production.

## Canary sequence

1. Deploy the OIDC-capable scheduler endpoint.
2. Let **Production smoke** complete successfully on the same main push.
3. The temporary `workflow_run` trigger starts **Book Index scheduler canary**.
4. Confirm the OIDC token is accepted by production.
5. Confirm due lists create isolated `BookIndexFetchRun` rows.
6. Confirm a source failure does not prevent later due lists.
7. Confirm no list runs again before its `collectionEveryMinutes` boundary.

The temporary `workflow_run` trigger is only a bootstrap mechanism. It is
removed after the first production canary PASS.

## Automatic activation

Automatic cron remains disabled until the canary passes.

After PASS, replace the temporary `workflow_run` bootstrap trigger with:

`17 * * * *`

Keep:

- concurrency group: `book-index-scheduler`
- `cancel-in-progress: false`
- `id-token: write`
- the same OIDC audience and production verification policy.

The hourly workflow check does not mean hourly collection of every source;
per-list `collectionEveryMinutes` stays authoritative.

## Rollback

If the OIDC canary fails:

1. keep automatic cron disabled;
2. inspect the workflow job result and production response;
3. if authentication failed, fix only OIDC trust/claim handling;
4. if collection failed, inspect only the affected list's latest fetch run;
5. do not bypass source protection or shorten cadence to force retries.

Snapshot history is never deleted as part of scheduler rollback.
