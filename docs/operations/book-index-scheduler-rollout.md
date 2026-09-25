# Book Index scheduler rollout

Status: **AUTOMATIC_CRON_DISABLED / CANARY_READY**

The Book Index scheduler foundation uses the same internal-job pattern already
used elsewhere in İlkOku, but it has its own dedicated secret and does not
reuse another job's credentials.

## Runtime behavior

- The scheduler iterates only enabled Book Index lists with a
  `collectionEveryMinutes` value.
- The last fetch-run start time is the cadence boundary. A failed run therefore
  cannot cause immediate repeated requests to the same external source.
- Due lists execute sequentially.
- A failure in one list is captured in that list's result and does not stop
  later lists from running.
- Collector-level immutable fetch runs and observations remain authoritative;
  the scheduler does not overwrite snapshot history.

## Secret boundary

Create one independent secret pair:

| Surface | Name |
| --- | --- |
| GitHub Actions | `BOOK_INDEX_SCHEDULER_SECRET` |
| Production environment | `BOOK_INDEX_SCHEDULER_SECRET` |

Requirements:

- use a unique high-entropy value of at least 32 random bytes;
- the GitHub and production values must match;
- do not reuse CMS, email, writer-summary or other job secrets;
- never commit or paste the value into logs, issues, PRs or chat.

## Canary sequence

1. Deploy the scheduler endpoint to production.
2. Configure the dedicated secret pair.
3. Run the **Book Index scheduler canary** workflow manually.
4. Confirm the workflow succeeds.
5. Confirm due Book Index lists created isolated `BookIndexFetchRun` rows.
6. Confirm one source failure does not prevent later due lists from running.
7. Confirm no source is called again before its configured
   `collectionEveryMinutes` window.

## Automatic activation

Automatic cron is intentionally not enabled in the foundation PR.

After the canary passes, activate the GitHub Actions schedule in a separate,
small PR. Intended scheduler-check cadence: **hourly**. The per-list
`collectionEveryMinutes` value remains the real collection cadence, so an
hourly scheduler check does not mean hourly collection of every source.

Suggested cron after approval:

`17 * * * *`

Keep workflow concurrency at `book-index-scheduler` with
`cancel-in-progress: false`.

## Rollback

If the canary fails:

1. keep automatic cron disabled;
2. inspect the affected list's latest `BookIndexFetchRun`;
3. fix only that source or scheduler defect;
4. do not bypass source protection or shorten the configured collection
   interval to force retries;
5. rerun the manual canary only after the cause is understood.
