# İlkOku Commerce P0 — additive legal-party foundation

Status: **IMPLEMENTATION PR ONLY / NOT DEPLOYED / NO ACTIVATION**.

## Scope
- P0-01: `LegalParty` records with verified/pending lifecycle and nullable, independently verified legal identity fields.
- P0-02: `WorkSellerAssignment` per work with explicit `platform_direct` / `third_party` mode, version and approver.
- P0-03: `WorkSalesAuthorization` per work and party with document hash, scoped rights and validity interval.

These tables contain **no fabricated legal identities or automatic backfill** from `Work.authorId`. The existing `Work.saleConfiguration.saleModel` remains independent of the seller mode. They are additive to existing models and have no web/API/CMS mutation endpoints. The unique nullable `currentKey` is reserved for a future transactionally enforced at-most-one-current-assignment-per-work invariant; it does not itself prove assignment validity.

## Explicitly not implemented

- Real legal-party verification, evidence storage, approval services and role-level permission checks.
- Runtime resolution of the correct seller/rights; commerce acquisition gates and checkout disclosures.
- Order legal/fiscal snapshots; immutable historical document archive.
- Invoice, tax, refund, payment provider and settlement logic.
- Operational rollout guards for 0 TL and paid acquisitions.
- Any production configuration, contract activation or migration execution.

**Do not merge/deploy as a complete commerce launch**. This is only foundational database scaffolding. A successful build does not imply that active acquisitions comply with the new approved design. Current 0 TL runtime behavior must be reviewed before deploying commerce changes; a disabled paid-checkout flag alone does not disable staged 0 TL acquisition.

## Future integration requirements
1. P0-07 must fail closed for *new acquisitions* when no verified legal party, active seller assignment and valid seller authorization exist. Preserve existing paid entitlements and pre-activation free/preview behavior.
2. P0-04/06 must snapshot the actual legal seller and the exact consumer disclosures/acceptances at order creation.
3. P0-11 must require an authorized administrator for verification/approval. Publisher role preview is read-only.
4. P0-13 dry-run migration on a copy of production-like data; compare all pre/post existing table row counts and historic order/entitlement invariants. Restore-from-backup must be tested.
5. P0-12 test matrix and P0-14 deployment guards must pass before independent live activation approval.

## Review/CI
`scripts/security-contract-commerce-legal-party-foundation.test.mjs` verifies additive tables, rights linkage, versioning and no legacy data backfill. This static contract is not a substitute for Prisma migration diff, real MariaDB integration tests, browser UAT or live deployment verification.
