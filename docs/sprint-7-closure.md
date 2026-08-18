# Sprint 7.4 — Closure Readiness

## Current status

`OPEN_HUMAN_UAT`

Sprint 7 is technically prepared for closure, but it is not closed while authenticated production UAT still contains `HUMAN_PENDING` or `BLOCKED` rows.

## Technical evidence

- Sprint 7.1 merged through PR #247: `deepmerge-ts@8.0.1` is pinned through npm overrides and the temporary HIGH advisory allowance is removed.
- Sprint 7.2 merged through PR #248: new writer-initiated legacy `PublisherSubmission` creation is retired while historical lifecycle data and operations remain available.
- Sprint 7.3 merged through PR #249: production UAT matrix and executable role/workflow contracts are in CI.
- Canonical `main` after Sprint 7.3: `b7ac969914e1622cb88565a0fb00b38ab1d2e239`.
- Latest Sprint 7.3 PR validation: CI #703 PASS and Production Smoke #611 PASS.
- Sprint 7 open-PR audit on 2026-08-18 found no open pull requests matching Sprint 7.
- The standard CI already exercises strict dependency audit, lint, security contracts, disposable MariaDB, DB security contracts, strict release measurement, fresh DB recovery, strict measurement on the recovered DB, and production build.

## Closure gate

Use the non-blocking status command while human acceptance is in progress:

```bash
npm run release:sprint7:status
```

Use the strict closure gate only when all authenticated production UAT rows have been completed:

```bash
npm run release:sprint7:close
```

The strict command must fail while any critical row is `HUMAN_PENDING` or `BLOCKED`. It may report `READY_TO_CLOSE` only when all 33 critical rows are `HUMAN_PASS`.

## Remaining human acceptance

The source of truth is `docs/sprint-7-production-uat.md`. Reader, Writer, Editor, Publisher, Admin/CMS and cross-role negative checks must be exercised with normal production accounts. Credentials, cookies, tokens and PII must never be copied into GitHub issues, CI logs or fixtures.

## Final closure procedure

1. Complete authenticated production UAT and record each critical row as `HUMAN_PASS` or `BLOCKED`.
2. If a row is `BLOCKED`, fix it in a small dedicated PR and re-run CI + Production Smoke.
3. Run `npm run release:sprint7:close`; it must return `READY_TO_CLOSE` with 33/33 human passes.
4. Confirm no open or superseded Sprint 7 PR remains.
5. Confirm the final closure PR/main validation is green.
6. Close issue #246 only after all conditions above are true.

Until then, Sprint 7 remains deliberately open rather than being declared complete from automated evidence alone.
