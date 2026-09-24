# Scoped job secret rollout

Status: **EXTERNAL_CONFIGURATION_PENDING**

This runbook completes the transition from the shared legacy
`WRITER_DAILY_SUMMARY_SECRET` fallback to dedicated secrets for independent
production jobs.

## Scope

Dedicated secret pairs:

| Job | GitHub Actions secret | Production environment variable |
| --- | --- | --- |
| CMS publishing scheduler | `CMS_SCHEDULER_SECRET` | `CMS_SCHEDULER_SECRET` |
| Email operations | `EMAIL_OPERATIONS_SECRET` | `EMAIL_OPERATIONS_SECRET` |
| Weekly discovery summary | `WEEKLY_DISCOVERY_SUMMARY_SECRET` | `WEEKLY_DISCOVERY_SUMMARY_SECRET` |

`WRITER_DAILY_SUMMARY_SECRET` remains dedicated to Writer Daily Summary and
must not be removed or rotated as part of this transition.

## Current compatibility boundary

Until this runbook is completed, production code intentionally retains the
legacy compatibility fallback:

- CMS scheduler: scoped secret → `WRITER_DAILY_SUMMARY_SECRET`
- Email operations: scoped secret → `WRITER_DAILY_SUMMARY_SECRET`
- Weekly discovery: scoped secret → `SUMMARY_JOBS_SECRET` → `WRITER_DAILY_SUMMARY_SECRET`

Do **not** remove those fallbacks before the verification steps below pass.

## 1. Generate the scoped values

Create three independent high-entropy values.

Rules:

- one unique value per job;
- do not reuse the Writer Daily secret;
- use at least 32 random bytes of entropy;
- never commit, log, screenshot or paste the values into issues/PRs/chat.

## 2. Configure GitHub Actions

In repository settings, create/update these repository secrets:

- `CMS_SCHEDULER_SECRET`
- `EMAIL_OPERATIONS_SECRET`
- `WEEKLY_DISCOVERY_SUMMARY_SECRET`

The value for each secret must exactly match the corresponding production
environment variable from the next step.

## 3. Configure production

Set the same three names and matching values in the production runtime
environment that serves `ilkoku.com`.

After changing production environment variables, use the hosting platform's
normal deployment/restart mechanism so the running application actually reads
the new values.

Do not remove `WRITER_DAILY_SUMMARY_SECRET` during this rollout.

## 4. Verify scoped-only operation

Run/verify each job separately:

1. CMS publishing scheduler
2. Email operations
3. Weekly discovery summary

Acceptance for each job:

- GitHub Actions run succeeds;
- production endpoint authenticates the scoped value;
- expected job logic executes;
- no secret value appears in logs;
- no reliance on the legacy fallback is required.

A successful historical scheduled run is **not** sufficient evidence because
the compatibility fallback can make that run pass.

## 5. Remove compatibility fallbacks

Only after all three scoped jobs pass, create one controlled code PR that
updates both sides of the boundary:

### Workflows

- `.github/workflows/cms-publishing-scheduler.yml`
- `.github/workflows/email-operations.yml`
- `.github/workflows/weekly-discovery-summary.yml`

Each workflow must use only its dedicated scoped GitHub secret.

### API routes

- `src/app/api/internal/cms-scheduler/route.ts`
- `src/app/api/internal/email-operations/route.ts`
- `src/app/api/internal/weekly-discovery-summary/route.ts`

Each route must authenticate only its dedicated production environment
variable.

Writer Daily Summary remains unchanged.

## 6. Final verification

Before merging the fallback-removal PR:

- lint PASS;
- security contracts PASS;
- application build PASS;
- browser QA PASS;
- CMS scheduler scoped run PASS;
- Email operations scoped run PASS;
- Weekly discovery scoped run PASS.

After merge:

- main CI PASS;
- Production Smoke PASS;
- next scheduled execution of each scoped job must remain successful.

## Rollback

If a scoped job fails after fallback removal:

1. do not copy another job's secret into it;
2. verify the GitHub secret and production environment variable are the same
   pair for that job;
3. verify production picked up the environment change;
4. revert the fallback-removal PR only if service continuity requires it;
5. keep the three scoped values independent.

The end state is one job → one GitHub secret → one matching production
environment variable.
