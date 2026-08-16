# İlkOku fresh-database recovery baseline

## Why this exists

The repository's historical Prisma migration directory begins at `20260725_work_level_editor_review`, but that migration assumes the pre-existing `Work` table. Therefore `prisma migrate deploy` alone cannot reconstruct İlkOku from an empty MariaDB instance.

Production is not re-baselined by this recovery path. Existing migration files, names and production migration checksums remain untouched.

## Recovery model

The repository keeps three version-controlled recovery artifacts:

1. `prisma/recovery/baseline.schema.prisma` — a frozen Prisma schema snapshot representing the recoverable baseline.
2. `prisma/recovery/baseline-manifest.json` — the exact historical migration set considered part of that baseline and the raw-SQL migrations that Prisma schema cannot represent.
3. `scripts/recover-fresh-database.mjs` — a fail-closed reconstruction command.

The command only runs when the target database is completely empty and `RECOVERY_CONFIRM_EMPTY_DATABASE=YES` is explicitly set.

Recovery then:

1. creates the frozen Prisma-managed schema with `prisma db push`;
2. replays only the manifest-listed raw baseline migrations needed for migration-only operational tables (notification preferences/summaries, email operations and CMS core);
3. records the historical baseline migrations through `prisma migrate resolve --applied`, so Prisma calculates and stores their real migration-file checksums rather than inventing a parallel ledger;
4. runs normal `prisma migrate deploy`, which applies any migrations newer than the frozen cutoff;
5. verifies required Prisma and raw-SQL tables plus the migration ledger.

## Safety rules

- Never point the recovery command at production or any non-empty database.
- Never edit historical migration files to make fresh replay work.
- Never move the baseline cutoff casually. A deliberate baseline advance requires a new frozen schema snapshot, reviewed raw-SQL replay set and a green recovery CI run.
- New migrations newer than the cutoff stay normal migrations and are applied by `prisma migrate deploy` after baseline reconstruction.
- A new migration that creates objects not represented by Prisma does not automatically belong in the baseline. If the baseline is intentionally advanced past it, add it to `replayAfterSchemaPush` and prove recovery in CI.

## Command

```bash
RECOVERY_CONFIRM_EMPTY_DATABASE=YES \
DATABASE_URL='mysql://user:password@host:3306/empty_database' \
npm run db:recover:fresh
```

The command refuses to continue if the selected database already contains a base table.

## CI contract

Normal CI provisions a second clean MariaDB service dedicated to this recovery test. The recovery database is independent from the disposable database used by concurrency/security contracts. A pull request cannot pass CI if the frozen baseline drifts, a required raw table is omitted, Prisma's migration ledger cannot be reconstructed, or a post-baseline migration cannot deploy.
