# Sprint 5C — Release Measurement, UAT and Closure

## Scope

Sprint 5C closes release readiness without introducing a third-party analytics stream or a second source of truth.

The measurement layer is read-only and aggregate-only. It derives operational counts from the product tables that already own the relevant state:

- reader activity: `ReadingProgress`, `ReadingAccess`, `Favorite`, `Comment`
- public catalogue: `Work`, `Chapter`
- publisher discovery: `PublisherWorkLike`, `PublisherWorkFavorite`, `PublisherAuthorLike`, `PublisherAuthorFavorite`, `PublisherAuthorFollow`, `PublisherDiscoveryShare`
- publisher/editor workflow: `PublisherEditorRequest`, `PublisherSubmission`
- delivery health: `EmailDelivery`
- audited product actions: `AuditLog`

No e-mail address, user id, IP address, user-agent, token, password hash, share note or audit metadata is emitted by the release report.

## Commands

Generate a read-only aggregate report:

```bash
npm run release:measure
```

Generate the same report and fail when canonical public-work integrity is broken:

```bash
npm run release:measure:strict
```

`--strict` currently treats these as release blockers:

- a public/published work whose publication state is internally inconsistent
- a public/published work without at least one live published chapter

Stale pending e-mail deliveries are reported as an operational warning, not an automatic release failure.

## CI release gates

Normal CI now proves all of the following on every PR and on `main`:

1. dependency audit
2. lint
3. static security and release-readiness contracts
4. disposable MariaDB schema creation
5. MariaDB concurrency/security contracts
6. strict release measurement against the disposable database
7. full fresh-database recovery from the version-controlled recovery baseline
8. strict release measurement against the recovered database
9. production build

Production Smoke remains the live-route gate. The role-matrix contract separately verifies that reader, writer, editor, publisher and admin workspace roots exist and stay behind their intended proxy boundaries without multiplying live smoke requests and triggering avoidable edge/WAF throttling.

## Role-matrix UAT boundary

Automated release contracts cover:

- Reader: `/okuyucu`, `/kesfet`
- Writer: `/yazar`, `/eserlerim`, `/yazmaya-devam`, shared `/bildirimler`
- Editor: `/editor`, `/editor/bildirimler`, publisher editor-request surface
- Publisher: `/yayinevi`, discovery, notifications and editor-request surfaces
- Admin: `/admin` / canonical system-management gate
- CMS: protected `/icerik` workbench and the existing 20-route live smoke package

The shared notification route has two independent gates and both must agree:

- page-level `canAccessNotificationWorkspace()`
- proxy-level `notificationWorkspaceRoles`

This prevents the earlier writer-notification mismatch from returning.

## Audit/measurement privacy contract

Publisher engagement audit records may contain operational identifiers such as `publisherId`, `workId`, `authorId`, state and counts. They must not copy communication content or direct recipient identifiers into audit metadata.

The release-readiness contract checks the audited engagement repositories for prohibited metadata keys such as direct e-mail addresses, notes/content, tokens, passwords, IP addresses and user agents.

## Release closure

A release candidate is technically closable when:

- PR CI and Production Smoke pass
- `main` CI and Production Smoke pass again after merge
- fresh-database recovery passes
- release measurement runs successfully on both disposable and recovered schemas
- no stale/superseded release PR is left open without an explicit reason

Authenticated browser acceptance with real production accounts remains a separate human acceptance activity; CI does not impersonate real users or store production credentials.
