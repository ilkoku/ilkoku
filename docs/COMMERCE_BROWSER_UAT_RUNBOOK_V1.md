# İlkOku Commerce Browser / Human UAT Runbook v1

Status: **AUTOMATED_PASS / HUMAN_PENDING**

This runbook is the browser/human validation layer for the frozen model in
`docs/COMMERCE_FOUNDATION_V1.md` and the implementation matrix in
`docs/COMMERCE_UAT_V1.md`.

It does **not** replace CI or the code-level audit. It must not be marked `HUMAN_PASS`
unless the scenarios below are executed against the exact Commerce branch build
with separate writer, reader and admin identities.

## 1. Hard safety rules

- Test the exact branch/commit under review; record the commit SHA before starting.
- Do not merge to `main` merely to make UAT possible.
- Do not enter real card, CVV, PAN, carrier credentials or payment secrets.
- Do not enable a production payment provider only for testing convenience.
- Do not invent refund, payout, tax/withholding or commission behavior.
- Do not use one account for multiple roles when validating role boundaries.
- A provider-dependent scenario that cannot safely run remains **HUMAN_PENDING**; do not claim HUMAN_PASS.
- A missing/incorrect UI result in an actually attempted browser flow is **BLOCKED**; do not change the frozen product rule just to pass UAT.

Project-standard status vocabulary:

- `AUTOMATED_PASS` — repository/CI/code-level evidence covers the technical boundary.
- `HUMAN_PENDING` — the browser flow has not yet been completed by the required real role/account, including cases where an intentionally inactive provider prerequisite prevents safe execution.
- `HUMAN_PASS` — the exact browser flow was completed successfully by the required real role/account.
- `BLOCKED` — the browser flow was actually attempted and failed; a corrective change is required before acceptance.

An intentionally inactive payment/provider prerequisite is **not** a failure. Keep
that row `HUMAN_PENDING` with the prerequisite recorded.

## Current execution note — 24.09.2026

- Commerce Foundation PR #945 is merged; the frozen Commerce model is now part of `main`.
- Current validated `main` baseline at the time of this note: `949e8269da55a078f0f28e17196eb13362b86aa4`.
- Main CI run `36021229299`: **SUCCESS**.
- Production Smoke run `36021229025`: **SUCCESS**.
- Repository/code-level Commerce controls remain **AUTOMATED_PASS**.
- Production browser/human acceptance remains **HUMAN_PENDING** until each required Writer, Reader and Admin flow is actually exercised with the required real role/account identities and dated evidence is recorded.
- Provider-dependent payment scenarios remain **HUMAN_PENDING** because no operational production-safe payment provider adapter is registered.
- Green CI, browser automation or Production Smoke is technical evidence only; none of them promotes a human row to `HUMAN_PASS`.

## 1.1 Exact deployment SHA verification

Before any production browser scenario:

1. Read the current `main` HEAD SHA from GitHub and record the exact build intended for testing.
2. Open `/api/build-info` on `https://ilkoku.com`.
3. Confirm the returned `commitSha` equals the exact recorded `main` SHA.
4. If `commitSha` is `null`, missing, stale or different, do not promote the scenario to `HUMAN_PASS`; keep it `HUMAN_PENDING` until build identity is proven.

The endpoint is generated from build-time `git rev-parse HEAD`; it does not read runtime ENV values, user data or the database, and its response is `no-store` / `noindex`.

## 2. Required environment record

Record these before any browser test:

| Field | Value |
| --- | --- |
| Branch | `main` |
| Commit SHA | |
| Production URL | `https://ilkoku.com` |
| Database/environment | |
| Checkout flag | |
| Operational production-safe provider | |
| Active writer agreement version/hash | |
| Active reader purchase terms version/hash | |
| Tester | |
| Date/time | |

The production build SHA shown by `/api/build-info` must match the SHA recorded here. If it
cannot be proven, keep the affected browser rows `HUMAN_PENDING` and do not infer acceptance from CI, browser automation or smoke results.

## 3. Required test identities and data

Use three separate accounts:

1. **Writer UAT account**
2. **Reader UAT account**
3. **Admin UAT account**

Prepare at least:

- one free published work;
- one never-activated paid-staging work;
- one previously activated paid work only if such a safe fixture already exists;
- at least two published chapters in the paid test work, with one intended as
  `Ön İzleme` and one as `Kilitli`;
- one reader entitlement fixture only if it can be created through approved
  test data or an already-valid purchase/entitlement path;
- author and platform coupon fixtures only where the frozen rules allow them.

Do not fabricate production payment records or manually grant financial truth
outside an approved test fixture.

## 4. Evidence standard

For every executed scenario record:

| Field | Requirement |
| --- | --- |
| Result | HUMAN_PENDING / HUMAN_PASS / BLOCKED |
| Account role | Writer / Reader / Admin |
| URL | Exact tested route |
| Work/order/coupon reference | Non-secret identifier only |
| Evidence | Dated human acceptance note; optional screenshot/recording may be retained outside the repository |
| Notes | What was observed |
| Defect | GitHub issue/PR note if `BLOCKED` |

Never capture passwords, session cookies, provider secrets, full IP evidence,
card information or other credentials in screenshots.

## 5. Writer browser UAT

### W-01 — Satış & Erişim entry

Account: Writer

1. Open `/satis-erisim`.
2. Confirm the first visible workflow step is work selection.
3. Open a test work.

Expected: work selection is Step 1 and the work-specific flow continues without
exposing admin or reader-only actions.

### W-02 — Explicit chapter access

Account: Writer

1. Open the work's Satış & Erişim page.
2. Assign one chapter `Ön İzleme` and another `Kilitli`.
3. Save.
4. Repeat with one chapter selection intentionally omitted.

Expected: complete choices save; missing choice fails closed and does not silently
default to Preview.

### W-03 — Paid staging before real payment path

Account: Writer

Precondition: never-activated work and no operational production-safe payment path.

1. Select `Ücretli`.
2. Inspect Step 3.

Expected: `0 TL` appears under the Paid option; no real price input is required
for this staging state.

### W-04 — Provider-free staged 0 TL acquisition

Account: Writer + Reader

Precondition: never-activated paid work, no operational provider, active reader
digital-content purchase terms.

Expected: the work remains staged/ready at 0 TL rather than becoming non-zero
live paid access. Preview remains readable. Kilitli chapters require entitlement,
and the reader can obtain that entitlement through the 0 TL purchase path without
an external provider.

If reader purchase terms are not active yet, staged access remains fail-open and
the row stays `HUMAN_PENDING` until the terms prerequisite is satisfied.

### W-05 — Writer agreement evidence

Account: Writer

1. Open the agreement step.
2. Accept the currently active writer agreement.
3. Return to the flow and confirm acceptance is recognized.

Expected: acceptance succeeds only for the active agreement lifecycle. No UI path
silently overwrites a same-version/different-hash acceptance.

Hash-conflict behavior may remain code-level only unless a safe fixture exists.

### W-06 — Final confirmation without payment provider

Account: Writer

Precondition: never-activated paid work, no operational provider.

1. Complete chapter access and agreement prerequisites.
2. Give work-level final confirmation.

Expected: the work becomes staged/ready at 0 TL. If reader purchase terms are
active, the reader-facing Preview/Kilitli plan is enforced through provider-free
0 TL acquisition.

### W-07 — Draft edit must not leak live

Account: Writer + Reader

Precondition: previously activated paid fixture exists safely.

1. As Writer, change price/model/chapter access and save without final work-level confirmation.
2. As Reader in a separate session, reload the public work and reading surfaces.

Expected: Reader still sees the last confirmed paid snapshot. Draft model, price
and chapter-access changes do not become live before the next final confirmation.

If no safe previously-activated fixture exists: keep the row `HUMAN_PENDING` and record the missing prerequisite.

## 6. Reader browser UAT

### R-01 — Free work

Open a free published work as Reader.

Expected: all published chapters remain readable.

### R-02 — Never-activated staged paid work at 0 TL

Precondition: active reader digital-content purchase terms.

1. Open the staged paid work as Reader without entitlement.
2. Confirm the Preview chapter remains readable.
3. Confirm the Kilitli chapter shows a 0 TL purchase gate.
4. Open the 0 TL checkout, accept the active reader purchase terms and complete.
5. Confirm success redirects to `/kutuphanem/satin-aldiklarim`.
6. Confirm the work appears in the library and the previously Kilitli chapter is readable.

Expected: no external payment provider is used; a paid 0 TL Order, consent
evidence and ACTIVE work entitlement are created.

### R-03 — Preview chapter

Precondition: active paid fixture exists safely.

Expected: `Ön İzleme` chapter remains readable without entitlement.

### R-04 — Locked chapter without entitlement

Precondition: active paid fixture exists safely.

1. Open public work page without entitlement.
2. Attempt to open the locked chapter.
3. Inspect rendered page/DOM and normal browser source/network response where feasible.

Expected: full locked chapter content is not exposed; purchase-required behavior
appears only when purchase is actually available.

### R-05 — Entitled reader

Precondition: approved entitlement fixture exists.

Expected: current and future locked chapters in the same work are readable under
the work entitlement.

### R-06 — Provider/checkout outage after activation

Precondition: safe previously-activated paid fixture.

Expected:

- existing entitlement continues to read;
- non-entitled reader remains locked;
- the work does not become free;
- new purchase may be unavailable.

### R-07 — Locked but purchase unavailable

Expected: public work UI distinguishes locked content from purchase availability.
It must show that sale is temporarily unavailable and must not advertise an active
offer when the payment path is unavailable.

### R-08 — Active editor review bypass

Account: an editor with a valid active review assignment, only if such a fixture exists.

Expected: editor review reading works through the explicit review path without
opening ordinary reader access.

If no approved editor fixture exists: keep the row `HUMAN_PENDING` and record the missing prerequisite.

### R-09 — 18+ gate

Use an adult-content test work only if already approved for UAT.

Expected: age/adult-content gate remains required before reading and before checkout;
commerce does not bypass it.

## 7. Checkout and payment browser UAT

The staged 0 TL acquisition scenario does **not** require a payment provider.
Non-zero scenarios below require an intentionally configured safe payment path.
Do **not** activate production credentials merely to complete UAT.

### C-00 — Staged 0 TL acquisition

Account: Reader

Precondition: writer-confirmed Paid work in `ready` state at 0 TL and active
reader purchase terms.

Expected: reader sees 0 TL, accepts the purchase terms, completes without a
Payment/provider call, receives a paid Order + ACTIVE entitlement, is redirected
to **Kütüphanem → Satın Aldıklarım**, and sees a successful purchase message.

### C-01 — Non-zero checkout
Expected: pending order/payment and consent are established before provider handoff.

### C-02 — Verified provider success
Expected: succeeded payment, paid order, active entitlement and ledger posting
after verified amount/currency.

### C-03 — Provider failure/cancel
Expected: terminal order/payment state and released coupon reservation.

### C-04 — Duplicate success callback
Expected: no duplicate entitlement or ledger posting.

### C-05 — Invalid/unverified webhook
Expected: shared payment settlement lifecycle is not reached.

### C-06 — Missing provider adapter
Expected: paid Order is not created.

Until a safe operational provider exists, keep C-01 through C-05 `HUMAN_PENDING` and record the provider prerequisite. C-06 may be observed in a safe provider-unavailable
environment without creating real payments.

## 8. Coupon browser UAT

### K-01 — Author coupon

Account: Writer

Expected: writer can scope the coupon only to their own paid work. Percentage and
fixed discounts validate correctly.

### K-02 — İlkOku coupon

Account: Admin

Expected: platform coupon scope controls work as designed and UI states that the
writer earning base is protected.

### K-03 — 100% İlkOku coupon

Requires a safe active-paid checkout fixture.

Expected: reader total is 0; no external Payment/provider handoff occurs; order,
coupon redemption, entitlement and campaign ledger complete.

If the payment rollout prerequisites needed to reach this state are not safely available, keep the row `HUMAN_PENDING` and record the prerequisite.

### K-04 — Limits

Expected: total/per-user limits reject consumption beyond allowed usage. Reserved
consumption must count toward the transactional limit behavior.

### K-05 — Invalid lifecycle

Expected: expired, not-started or paused coupon is rejected.

### K-06 — Numeric inputs

Test normal values and invalid values for percentage, fixed amount and usage limits.

Expected: valid digit/decimal inputs parse as designed; negatives, malformed
values and over-precision fail closed.

## 9. Admin / Finance browser UAT

Account: Admin

### F-01 — Overview
Expected: gross sales volume is visually separate from İlkOku income.

### F-02 — İlkOku Gelirleri
Expected: only recorded `platform_commission` movements are represented as platform income.

### F-03 — Yazar Hakedişleri
Expected: only recorded `author_earning` movements appear, with earning-base context.

### F-04 — Kampanya Maliyetleri
Expected: `platform_coupon_discount` is separate and does not appear as a writer deduction.

### F-05 — Writer Gelirler
Account: Writer

Expected: ledger/balance-derived data only; no reader card details,
provider-private fields or payment secrets.

### F-06 — AuthorBalance
Expected: balance is presented as operational balance/projection; ledger remains
the financial source of truth.

### F-07 — Payouts
Expected: read-only. No real payout execution button/path is available.

### F-08 — Reconciliation
Expected: mismatches are diagnostic only; there is no automatic repair action.

## 10. Unresolved-policy negative test

Verify there is no executable UI for:

- partial-refund policy decisions;
- coupon restore/reuse after refund;
- final commission percentage configuration;
- tax/withholding execution;
- payout threshold/provider transfer execution;
- production card/carrier secret entry.

Presence of an executable mutation for an undecided rule is `BLOCKED`.

## 10.1 Final Release production evidence boundary

Commerce Foundation code acceptance and repository-wide Final Release production UAT
are separate evidence layers even though the foundation is already merged to `main`.

- **Commerce production browser acceptance:** execute the safely available Writer, Reader, Coupon and Finance scenarios on an exact-SHA production build with the required real role/account identities.
- **Final Release production acceptance:** the Commerce rows in `docs/final-release-uat-addendum.md` remain `HUMAN_PENDING` until their corresponding production flows are exercised with real production accounts under the existing Final Release rules.
- Automated CI/browser evidence must not be copied into the Final Release matrix as `HUMAN_PASS`.
- Production paid-provider activation remains an additional, separate boundary and still requires the provider-dependent scenarios defined below this runbook's paid-activation acceptance rules.

## 11. Exit criteria

There are two distinct acceptance boundaries:

### Commerce production browser acceptance

This browser acceptance can be recorded when:

1. the exact tested production `main` SHA is recorded and matches `/api/build-info`;
2. every safely executable Writer, Reader, Coupon and Finance row is `HUMAN_PASS`;
3. provider-dependent rows that cannot yet run safely remain explicitly `HUMAN_PENDING` with the prerequisite recorded;
4. no attempted row is `BLOCKED`;
5. human acceptance evidence is recorded without credentials, session data or PII.

### Production paid-activation acceptance

Before real payment rollout is intentionally activated, every provider-dependent
checkout/payment row must also reach `HUMAN_PASS` on the approved safe payment
path. A foundation merge does not itself authorize production payment activation.

A code-level `AUTOMATED_PASS` or green CI alone is never sufficient to claim
`HUMAN_PASS`.
