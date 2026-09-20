# İlkOku Commerce Foundation v1 — Frozen Product Contract

Status: **Frozen for implementation**  
Date: 2026-09-20

This document is the implementation boundary for the first commerce foundation. Do not change the product model without an explicit product decision.

## 1. Author model

Commerce is **work-based**, not author-account-based.

Writer navigation gets two separate areas:

- **Satış & Erişim**
- **Gelirler**

Commerce controls are not embedded inside **Eserlerim**.

### Satış & Erişim flow

1. Select a work.
2. Plan chapter access.
3. Select publication model: Free or Paid.
   - If Paid, the price is automatically stored as **0 TRY** during the infrastructure phase.
   - The author does not enter a price in this phase.
4. Accept the current **İlkOku Yazar Yayın ve Erişim Sözleşmesi**.
5. Confirm the work-specific publication/sale configuration.
6. Publish or mark the paid setup as ready.

### Chapter access

Each chapter is independently selected by the author as:

- **Ön İzleme** (`preview`)
- **Kilitli** (`locked`)

There is no system rule such as “first N chapters free”.

For a free work, no payment is required. The saved access plan remains available if the work later becomes paid.

For a paid work, preview chapters are public to eligible readers; locked chapters require a valid work entitlement.

## 2. Purchase unit

Readers buy the **work**, not individual chapters.

A successful work purchase grants access to:

- all currently locked chapters, and
- locked chapters added to that same work later.

A later price change does not affect existing purchasers.

## 3. Agreements

The agreement is required for **both free and paid works**.

The general agreement is versioned and accepted by the author. Each work also receives a separate work-level confirmation snapshot containing:

- publication model,
- price when applicable,
- chapter access plan,
- agreement version,
- confirmation time.

Historical confirmations are immutable evidence. Unconfirmed writer edits must not alter the reader-facing state of a work that has already been activated as paid. While a new configuration is draft/ready, the last confirmed paid snapshot remains authoritative for reader-facing sale model, price display and chapter Preview/Kilitli enforcement until the next work-level confirmation is completed.

## 4. Money representation

Monetary values are stored in the smallest currency unit as integers.

Example:

- 149.00 TRY = 14900 kuruş.

Initial currency is TRY, while currency remains an explicit persisted field.

## 5. Coupons

There are two coupon owners.

### Author coupon

An author may create coupons only for the author's own works.

The author funds the discount.

Example:

- Work price: 100 TRY
- Author coupon: 20%
- Reader pays: 80 TRY
- Author earning base: 80 TRY

### İlkOku platform coupon

İlkOku administrators may create platform campaigns for:

- all paid works,
- selected works,
- selected authors.

A platform coupon **must not reduce the author's earning base**.

Example:

- Work price: 100 TRY
- İlkOku coupon: 20%
- Reader pays: 80 TRY
- Author earning base: 100 TRY
- 20 TRY is recorded as İlkOku campaign cost.

A 100% İlkOku coupon may produce a zero-value checkout. No external payment provider is called, the reader entitlement is granted, and the author's normal earning is funded by İlkOku.

Default rule: **one coupon per order**. Coupon stacking is disabled.

## 6. Reader experience

Free work:

- no checkout.

Paid work:

- price is visible,
- preview chapters remain readable,
- a locked chapter presents the work purchase gate.

Checkout contains:

- work,
- author,
- original price,
- coupon input,
- discount,
- final amount,
- payment method area,
- digital-content purchase acceptance.

Real card and carrier billing are **not enabled in this foundation phase**. Test-mode adapters must never activate paid reader locking in production.

Reader purchase terms start as draft. Checkout must fail closed until the active terms document has completed legal/product review and is activated.

Reader account surfaces:

- **Kütüphanem → Satın Aldıklarım**
- **Hesabım → Ödeme Geçmişi**

## 7. Entitlements

Access control uses an explicit work entitlement.

Reading rule:

1. If the work is free: allow.
2. If chapter is preview: allow.
3. If reader has an active entitlement for the work: allow.
4. Otherwise: show the purchase gate.

Payment price is never used directly as the access check.

## 8. Order and payment separation

Order and payment are separate entities.

One order may have multiple payment attempts.

Order statuses:

- draft
- pending_payment
- paid
- failed
- cancelled
- refunded

Payment providers remain provider-agnostic in this phase.

Before a work has ever been activated for real paid access, missing checkout/provider infrastructure is fail-open: staging must not lock the reader out. Enabling the commerce rollout flag by itself is not enough; first activation requires checkout plus at least one production-safe provider adapter. After a work has been activated as paid at least once, a temporary checkout/provider outage does **not** unlock its locked chapters; existing entitlements remain valid while new purchase availability may be temporarily unavailable.

### Normal paid orders

For a non-zero checkout:

1. the server revalidates the work, price, entitlement and coupon,
2. an Order is created as `pending_payment`,
3. the reader's current purchase-terms version/hash and acceptance evidence are stored,
4. a Payment attempt is created as `pending`,
5. any coupon is reserved before leaving İlkOku,
6. only then is the provider adapter called.

Coupon reservations count against total and per-user limits while the payment is pending. Provider initialization failure releases the reservation.

A provider callback must be cryptographically/authentically verified by the provider-specific adapter before it reaches the shared payment lifecycle. The shared lifecycle:

- identifies a payment by the unique provider + provider transaction id,
- is idempotent for repeated terminal notifications,
- verifies amount and currency before access is granted,
- marks the order paid only after verified success,
- converts a coupon reservation to used,
- creates or reactivates the work entitlement,
- posts idempotent sale/discount ledger movements,
- releases coupon reservations on failed/cancelled payment.

Raw card credentials or carrier billing credentials are not stored in İlkOku commerce tables.

### Zero-total coupon orders

If a valid coupon reduces an active paid work to **0 TRY**:

- the order is completed atomically without an external Payment record,
- coupon usage is revalidated and serialized before consumption,
- the coupon redemption is recorded,
- the active reader purchase-terms version/hash and acceptance evidence are stored with the order,
- an ACTIVE work entitlement is created,
- immutable order pricing snapshots are stored,
- gross sale and coupon discount movements are written to the financial ledger.

For an İlkOku-funded coupon, `authorEarningBaseAmount` remains the original work price. The actual author earning amount is not invented before commission/tax rules are finalized; those later allocation rules must calculate from the preserved earning base rather than the reader-paid total.

## 9. Writer income

Writer **Gelirler** displays:

- total sales,
- deductions,
- net writer earnings,
- pending amount,
- available amount,
- processing amount,
- paid amount,
- work-level income,
- transaction history.

Reader payment credentials and private payment details are never exposed to the author.

## 10. İlkOku administration

Two distinct admin concepts are retained:

### Ödeme Sistemi

Operational payment domain:

- overview,
- orders,
- payment attempts,
- providers,
- coupons & campaigns,
- refunds,
- entitlements,
- settings.

The first operational screens are wired directly to commerce records:

- **Siparişler** shows order status, immutable price/coupon snapshot, writer earning base, payment/refund counts, entitlement state and reader terms evidence.
- **Ödemeler** shows provider-neutral payment attempts, provider transaction id, terminal status and failure diagnostics without storing or exposing card/carrier credentials.
- **İadeler** is intentionally read-only in this phase. No approve/process action is exposed until partial-refund policy, coupon reuse after refund, and provider refund adapters are explicitly defined.
- **Erişim Hakları** shows entitlement source/status, reader, work sale state and linked order without deriving access from the current work price.
- **Ödeme Sağlayıcıları** exposes rollout/provider readiness without displaying or editing secrets. It is read-only in this phase.
- **Ayarlar** exposes checkout rollout, TRY currency, author agreement lifecycle, reader purchase-terms lifecycle and provider readiness as a read-only deployment/status view.

### Finans & Gelirler

Accounting domain:

- overview,
- İlkOku income,
- author earnings,
- author balances,
- payouts,
- platform campaign costs,
- reconciliation,
- financial ledger.

**Gross sales volume is not İlkOku revenue.**

## 11. Ledger

Financial truth is ledger-based. A mutable “single balance” is not the source of truth.

Initial ledger entry types:

- sale_gross
- author_coupon_discount
- platform_coupon_discount
- payment_provider_fee
- platform_commission
- author_earning
- refund
- tax_withholding
- adjustment
- payout

## 12. Price/model transitions

### Price change

Old orders preserve their original price snapshot. A changed price remains draft until the next work-level confirmation; only purchases after that confirmation use the new price. Price history is retained.

### Free → Paid

During the infrastructure phase, the author reviews the access plan and selects Paid. The system automatically stores the staged price as **0 TRY**. The author then satisfies the agreement requirement and gives a new work-level confirmation. Real price entry is introduced only when actual checkout/payment is explicitly enabled.

### Paid → Free

After the author completes the new work-level confirmation, the work becomes readable without purchase. Merely saving a draft Free selection does not alter the previously confirmed reader-facing paid state. Historical orders, earnings, ledger entries, confirmations, and entitlements are not deleted or rewritten.

## 13. Rollout safety

Until a real checkout path is intentionally enabled, paid configurations are **staged only**.

- Writers may prepare a paid model, chapter access plan and agreement/consent records.
- A paid configuration that has **never been activated for real paid access** must not lock reader access while checkout/provider infrastructure is unavailable.
- During this infrastructure phase, selecting **Paid** stores/displays a fixed **0 TRY** price; the author does not enter a price yet.
- Real price entry becomes available when the actual checkout/payment path is operational. If a work was already activated as paid before a temporary outage, its real price is preserved.
- The current reader experience therefore remains effectively free/open during the pre-activation infrastructure phase.
- After a work has been activated as paid at least once, a later checkout/provider outage must **not** make its locked chapters free. Existing entitlements remain valid; non-entitled readers stay locked while purchase may be temporarily unavailable.
- Checkout activation is controlled server-side with `COMMERCE_CHECKOUT_ENABLED=true`.
- Default and missing value is treated as disabled.
- When payment is later activated, the existing paid configuration can be promoted without rewriting the author model.

This is a rollout rule, not a change to the frozen product model.

## 14. Current implementation boundary

Included now:

- schema foundation,
- access-plan persistence,
- sale configuration,
- agreement evidence,
- work confirmation snapshots,
- coupons,
- orders,
- payment-attempt records,
- entitlements,
- refunds,
- ledger,
- author balance/payout foundation.

Not enabled now:

- real card charging,
- Payguru / carrier billing,
- author money transfer,
- final commission percentages,
- tax/withholding execution.

External payment providers will be attached later without changing the product model above.


### Finance operations workspaces

The Finance & Gelirler domain is wired to ledger/balance/payout records without inventing commission, tax, refund or payout execution rules.

- **Finans Hareketleri** is the ledger browser and financial source-of-truth view.
- **İlkOku Gelirleri** shows only recorded `platform_commission` movements. Gross sales volume is never labeled as İlkOku income.
- **Yazar Hakedişleri** shows only recorded `author_earning` movements and the preserved order earning base.
- **Yazar Bakiyeleri** shows AuthorBalance as an operational projection: pending, available, processing and paid.
- **Yazar Ödemeleri** is read-only until payout method, thresholds, tax/withholding and transfer execution are explicitly defined.
- **Kampanya Maliyetleri** shows `platform_coupon_discount` separately and keeps author earning-base visibility.
- **Mutabakat** cross-checks paid orders, sale_gross ledger entries and active entitlements. It diagnoses; it does not auto-repair records.

The writer **Gelirler** page reads the writer's ledger, balance projection and order snapshots. It shows sales, deduction movements, author earnings, pending/available/processing/paid balances and work-level details without exposing reader payment-provider identifiers or card/carrier data.
