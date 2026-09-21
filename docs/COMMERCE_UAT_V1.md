# İlkOku Commerce UAT v1

Status: **AUTOMATED_PASS / HUMAN_PENDING**

This checklist validates the frozen model in `docs/COMMERCE_FOUNDATION_V1.md`.
Automated contract/build checks can prove code invariants, but they do not replace
a real browser test with writer, reader and admin accounts.

## Automated cross-file audit

`scripts/security-contract-commerce-uat.test.mjs` cross-checks the main UAT
boundaries across writer UI/actions, reader access/redaction, checkout/provider
lifecycle, zero-total coupons, finance separation, unresolved read-only policy
areas, and private-route protection. It runs inside `npm run test:security`.

Passing this audit means the implementation files agree on the frozen rules; it
does **not** mark browser/human UAT as complete.

Browser execution procedure and evidence rules are defined in
`docs/COMMERCE_BROWSER_UAT_RUNBOOK_V1.md`.

The status vocabulary follows the existing Final Release UAT convention: code/CI evidence is `AUTOMATED_PASS`; a browser row becomes `HUMAN_PASS` only after the real role/account flow is exercised. An intentionally inactive provider prerequisite remains `HUMAN_PENDING`, not `BLOCKED`.


## Implementation audit result — 20.09.2026

CI Run **#2807** (`35537569339`) completed successfully on
`feature/commerce-foundation-v1` after the frozen-model contract assertions
were aligned with the confirmed-snapshot / `previouslyActivatedPaid` implementation.

Code-level cross-audit result:

- **A — Pre-activation writer flow:** W-01 through W-07 AUTOMATED_PASS.
- **B — First real paid activation:** A-01 through A-04 AUTOMATED_PASS.
- **C — Reader access:** R-01 through R-09 AUTOMATED_PASS.
- **D — Checkout and order lifecycle:** C-01 through C-06 AUTOMATED_PASS.
- **E — Coupons:** K-01 through K-06 AUTOMATED_PASS.
- **F — Finance:** F-01 through F-08 AUTOMATED_PASS.
- **G — Intentionally unresolved:** remains non-mutating/read-only where applicable; no policy was invented.

This result is an implementation/code audit only. Separate writer, reader and
admin browser UAT remains mandatory before merge. Provider-dependent scenarios
must only be executed when an intentionally configured production-safe payment
path exists.

## A. Pre-activation writer flow

| ID | Scenario | Expected |
| --- | --- | --- |
| W-01 | Writer opens Satış & Erişim | Work selection is step 1. |
| W-02 | Writer plans chapter access | Every chapter must explicitly be Ön İzleme or Kilitli. Missing/tampered values fail closed. |
| W-03 | Writer selects Ücretli before a real payment path exists | Price is fixed at **0 TL**; no price input is required. |
| W-04 | No operational provider exists | Work remains staged at 0 TL. If reader purchase terms are active, provider-free 0 TL acquisition is available; Preview stays open and Kilitli requires entitlement. If reader terms are inactive, the staged work remains fail-open. |
| W-05 | Writer accepts active agreement | Version/hash/time/audit evidence is stored; same-version hash mismatch is not overwritten. |
| W-06 | Writer confirms a never-activated paid work without payment provider | Configuration becomes ready at 0 TL. Active reader purchase terms allow provider-free 0 TL acquisition without promoting the work to non-zero paid activation. |
| W-07 | Writer edits an already activated paid work but has not given the next work-level confirmation yet | Reader-facing sale model, price/access enforcement and chapter access continue from the last confirmed snapshot; draft edits do not leak live. |

## B. First real paid activation

| ID | Scenario | Expected |
| --- | --- | --- |
| A-01 | Checkout + production-safe provider are operational | Real price entry becomes available. |
| A-02 | Paid price is 0 or invalid | Final paid activation fails closed. |
| A-03 | Any chapter access choice is missing | Publication/activation fails closed. |
| A-04 | Paid confirmation succeeds | Work records real activation history and paid access can be enforced. |

## C. Reader access

| ID | Scenario | Expected |
| --- | --- | --- |
| R-01 | Free work | All published chapters remain readable. |
| R-02 | Never-activated staged paid work at 0 TL | With active reader purchase terms: Preview is readable, Kilitli shows a 0 TL purchase gate, and entitlement unlocks it. Without active reader terms, staged access remains fail-open. |
| R-03 | Active paid + Ön İzleme chapter | Chapter is readable without purchase. |
| R-04 | Active paid + Kilitli + no entitlement | Full chapter content is not returned to the public showcase; reader is directed to purchase when purchase is available. |
| R-05 | Active paid + entitlement | Current and future locked chapters of the same work are readable. |
| R-06 | Previously activated paid work during provider/checkout outage | Existing entitlements remain readable; non-entitled readers stay locked; the work does **not** become free. |
| R-07 | Purchase temporarily unavailable | Public work page distinguishes locked access from checkout availability and does not advertise an active offer. |
| R-08 | Editor with active review assignment | Review reading bypass is resolved before commerce redaction. |
| R-09 | 18+ work | Existing adult-content gate remains mandatory before reading or checkout. |

## D. Checkout and order lifecycle

| ID | Scenario | Expected |
| --- | --- | --- |
| C-00 | Staged Paid work has confirmed 0 TL price and active reader purchase terms | No external Payment/provider call. Reader accepts terms, Order becomes paid at 0 TL, ACTIVE entitlement is created/reactivated, and the work appears in Kütüphanem → Satın Aldıklarım. |
| C-01 | Non-zero checkout | Order = pending_payment, Payment = pending, consent evidence is stored, coupon is reserved before provider redirect. |
| C-02 | Provider success | Verified amount/currency only: Payment succeeded, Order paid, entitlement active, ledger posted. |
| C-03 | Provider failure/cancel | Order/payment terminal state is stored and coupon reservation is released. |
| C-04 | Duplicate provider success notification | Idempotent; no duplicate entitlement or ledger postings. |
| C-05 | Invalid/unverified webhook | Shared payment lifecycle is not reached. |
| C-06 | No provider adapter | Paid order is not created. |

## E. Coupons

| ID | Scenario | Expected |
| --- | --- | --- |
| K-01 | Author percentage/fixed coupon | Only writer-owned paid work; earning base follows reader-paid discounted amount. |
| K-02 | İlkOku percentage/fixed coupon | Writer earning base remains original work price. |
| K-03 | 100% İlkOku coupon | Reader total 0, no external Payment record/provider call, Order paid + entitlement active + campaign ledger movement. |
| K-04 | Coupon total/per-user limit | Reserved + used consumption is counted transactionally. |
| K-05 | Coupon expired/not started/paused | Checkout rejects it. |
| K-06 | Coupon code/amount/limit numeric input | Standard digit input parses correctly; invalid input fails closed. |

## F. Finance

| ID | Scenario | Expected |
| --- | --- | --- |
| F-01 | Admin overview | Gross sales volume is separate from İlkOku income. |
| F-02 | İlkOku Gelirleri | Only recorded platform_commission movements are shown. |
| F-03 | Yazar Hakedişleri | Only recorded author_earning movements are shown with preserved earning base. |
| F-04 | Kampanya Maliyetleri | platform_coupon_discount is shown separately and does not reduce protected earning base. |
| F-05 | Writer Gelirler | Ledger/balance data only; no reader card/provider-private data. |
| F-06 | AuthorBalance | Treated as operational projection; ledger remains financial source of truth. |
| F-07 | Payouts | Read-only until payout method, tax/withholding and transfer rules are explicitly approved. |
| F-08 | Reconciliation | Detects paid-order/ledger/entitlement mismatches and does not auto-repair. |

## G. Intentionally unresolved / do not invent

- Partial refund policy.
- Coupon reuse/restore after refund.
- Final commission percentages.
- Tax/withholding execution.
- Payout thresholds/method/provider execution.
- Production card or carrier provider credentials.

These items require an explicit product/legal/finance decision before mutation
actions are added.

## Release gate

Before merge:

1. CI must pass lint, security contracts, disposable MariaDB schema, DB
   integration contracts, fresh recovery validation and production build.
2. Browser UAT should execute this matrix using separate writer, reader and
   admin accounts.
3. Staged 0 TL acquisition may run provider-free once active reader purchase
   terms exist. Non-zero commerce remains behind rollout/provider readiness
   protections until production payment/legal prerequisites are intentionally
   activated.
