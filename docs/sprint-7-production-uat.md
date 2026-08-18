# Sprint 7.3 — Authenticated Production UAT

## Purpose

This is the human acceptance boundary for the production product after Sprint 7.1 and 7.2.

Automated CI, MariaDB contracts, recovery, strict release measurement and Production Smoke do not impersonate real production users and do not store production credentials. A row may be marked `HUMAN_PASS` only after the relevant flow has been exercised with a real production account.

## Status vocabulary

- `AUTOMATED_PASS`: repository/CI/live-route contracts cover the technical boundary.
- `HUMAN_PENDING`: authenticated browser acceptance has not yet been recorded.
- `HUMAN_PASS`: the exact production flow was completed successfully by a real user.
- `BLOCKED`: the production flow failed and requires a corrective PR before acceptance.

## Global acceptance rules

- Use normal production accounts; never copy credentials, session cookies, tokens or PII into issues, logs or fixtures.
- Do not create artificial admin/editor/publisher privileges only to satisfy UAT.
- Every write must remain on the canonical server action/state-machine for that role.
- A failed human step is a release blocker only for the affected critical flow; record the symptom and open a small corrective PR.
- Do not mark the sprint closed while any critical row remains `HUMAN_PENDING` or `BLOCKED`.

## Reader

| Flow | Production path | Expected result | Automated | Human |
| --- | --- | --- | --- | --- |
| Sign in | `/giris` | Reader reaches reader workspace without role leakage | AUTOMATED_PASS | HUMAN_PENDING |
| Discover works | `/kesfet` | Search/filter/pagination returns only public eligible works | AUTOMATED_PASS | HUMAN_PENDING |
| Open work | `/kitap/{slug}` | Public work detail opens and blocked/non-public works stay unavailable | AUTOMATED_PASS | HUMAN_PENDING |
| Read chapter | `/oku/{slug}/{chapterSlug}` | Published chapter opens and reading state can progress | AUTOMATED_PASS | HUMAN_PENDING |
| Reader notifications | `/bildirimler` | Card opens, becomes read, envelope state changes, related record is separate | AUTOMATED_PASS | HUMAN_PENDING |

## Writer

| Flow | Production path | Expected result | Automated | Human |
| --- | --- | --- | --- | --- |
| Writer workspace | `/yazar` | Writer lands in writer shell and sees writer-only navigation | AUTOMATED_PASS | HUMAN_PASS |
| Create/edit work | `/eserlerim` | Work CRUD remains writer-owned; hidden publish bypass is unavailable | AUTOMATED_PASS | HUMAN_PASS |
| Chapter writing | `/yazmaya-devam` | Chapter editing/autosave surface opens for owned work | AUTOMATED_PASS | HUMAN_PASS |
| Canonical publish | writer publish action | Publication validates chapter content and updates Chapter + Work + audit atomically | AUTOMATED_PASS | HUMAN_PASS |
| Writer notifications | `/bildirimler` | Open/read/unread/related-target behavior works from writer account | AUTOMATED_PASS | HUMAN_PASS |
| Account settings | `/hesabim` | Sidebar sections, personal data, writing genres, notification preferences and security are usable | AUTOMATED_PASS | HUMAN_PASS |
| Publisher area | `/yayinevleri` | No new direct legacy application CTA exists; historical processes remain readable and pending/reviewing rows can still be withdrawn | AUTOMATED_PASS | HUMAN_PASS |

## Editor

| Flow | Production path | Expected result | Automated | Human |
| --- | --- | --- | --- | --- |
| Editor workspace | `/editor` | Only editor role reaches the editor workspace | AUTOMATED_PASS | HUMAN_PENDING |
| General pool / first review | editor work surfaces | First editor can claim once and complete through the canonical locked state machine | AUTOMATED_PASS | HUMAN_PENDING |
| Second editor | second-editor work surfaces | Second editor reviews independently; terminal completion cannot be downgraded by stale draft writes | AUTOMATED_PASS | HUMAN_PENDING |
| Editor notifications | `/editor/bildirimler` | Notification open/read/unread and related record behavior matches the shared model | AUTOMATED_PASS | HUMAN_PENDING |
| Publisher editor requests | `/editor/yayinevi-talepleri` | Eligible publisher request can be viewed/claimed only through authorized editor state transitions | AUTOMATED_PASS | HUMAN_PENDING |

## Publisher

| Flow | Production path | Expected result | Automated | Human |
| --- | --- | --- | --- | --- |
| Publisher workspace | `/yayinevi` | Active membership is required; admin preview stays read-only | AUTOMATED_PASS | HUMAN_PENDING |
| Discover works | `/yayinevi/kesfet/eserler` | Authorized discovery works without exposing ineligible/private material | AUTOMATED_PASS | HUMAN_PENDING |
| Engagement | publisher discovery surfaces | Like/favorite/follow/share actions respect effective member permissions and audit rules | AUTOMATED_PASS | HUMAN_PENDING |
| Follow notification | `/yayinevi/bildirimler` | New-work notification for followed authors resolves to authorized targets | AUTOMATED_PASS | HUMAN_PENDING |
| Editor request | `/yayinevi/editor-talepleri` | Request lifecycle uses canonical row-locked state transitions | AUTOMATED_PASS | HUMAN_PENDING |
| Historical submission | publisher submission detail | Existing legacy rows, files, decisions, internal notes, contracts and publication plans remain operable under granular permissions | AUTOMATED_PASS | HUMAN_PENDING |

## Admin / CMS

| Flow | Production path | Expected result | Automated | Human |
| --- | --- | --- | --- | --- |
| Admin workspace | `/admin` | Real admin role is required; role preview never gains write authority | AUTOMATED_PASS | HUMAN_PENDING |
| User/role control | admin user/role surfaces | Privileged transitions remain on locked canonical lifecycle and preserve last-admin safety | AUTOMATED_PASS | HUMAN_PENDING |
| CMS workspace | `/icerik` | CMS manager/admin boundary is fail-closed and private/noindex | AUTOMATED_PASS | HUMAN_PENDING |
| CMS global search | `/icerik/arama` | Editorial content/drafts are searchable; users/forms/audit/PII namespaces are excluded | AUTOMATED_PASS | HUMAN_PENDING |
| CMS editing | page/guide/legal/home/FAQ workbenches | Draft/live separation, publish authority, locale locks and corrupt-draft fail-closed behavior remain intact | AUTOMATED_PASS | HUMAN_PENDING |

## Cross-role negative checks

| Check | Expected result | Automated | Human |
| --- | --- | --- | --- |
| Reader cannot enter writer/editor/publisher/admin workspaces | Access denied or canonical redirect | AUTOMATED_PASS | HUMAN_PENDING |
| Writer cannot enter editor/publisher/admin write surfaces | Access denied or canonical redirect | AUTOMATED_PASS | HUMAN_PENDING |
| Editor cannot acquire publisher/admin authority | Access denied | AUTOMATED_PASS | HUMAN_PENDING |
| Publisher member without a permission cannot use its write action | Server-side denial; hidden UI is not the authority boundary | AUTOMATED_PASS | HUMAN_PENDING |
| Admin role preview cannot mutate as previewed role | Preview remains read-only | AUTOMATED_PASS | HUMAN_PENDING |

## Human acceptance evidence

- 2026-08-18 — Writer workspace `/yazar`: a real production writer account reached the writer shell and displayed writer-only navigation in the live browser acceptance session. No credential, cookie, session token or screenshot is stored in the repository.
- 2026-08-19 — Writer `/eserlerim`: owned-work listing/editing was exercised in production and the writer confirmed the flow passed without exposing a direct publish-status bypass.
- 2026-08-19 — Writer `/yazmaya-devam`: owned chapter editing/autosave was exercised in production and accepted.
- 2026-08-19 — Writer canonical publish action: a test/draft work was published through the normal publish flow; the user confirmed the public work/chapter remained available and content was preserved.
- 2026-08-19 — Writer `/bildirimler`: open/read/unread/related-record behavior was exercised and accepted in production.
- 2026-08-19 — Writer `/hesabim`: account navigation, personal data, writing genres, notification preferences and security sections were exercised and accepted.
- 2026-08-19 — Writer `/yayinevleri`: discovery/process tracking, filters and retirement of the new direct legacy application CTA were accepted in production.
- 2026-08-19 — Writer `/geri-bildirimler` corrective UAT: after PRs #258 and #259, a visible single professional report was successfully marked read in production; the unread card/status/count cleared as expected. This is supporting regression evidence and is not an additional closure-matrix row.

## Closure record

Sprint 7.3 remains **OPEN** while any critical row above is `HUMAN_PENDING` or `BLOCKED`.

Current automated baseline at creation of this matrix:

- Sprint 7.1 merged: permanent `deepmerge-ts@8.0.1` override and strict HIGH/CRITICAL audit gate.
- Sprint 7.2 merged: new writer-initiated legacy PublisherSubmission creation retired; historical lifecycle preserved.
- Canonical `main` at matrix creation: `a88c5fd7e3dcbfa9bce6e12f17de80e69196a080`.
