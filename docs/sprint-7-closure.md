# Sprint 7.4 — Closure Record

## Current status

`CLOSED_TECHNICAL_SCOPE`

Sprint 7 teknik kapsamı 19.08.2026 tarihinde tamamlanmış kabul edilmiştir. Kalan authenticated production human UAT satırları sahte `HUMAN_PASS` verilmeden **Final Release UAT** aşamasına devredilmiştir. Bu karar, Sprint 8 `/icerik` İçerik Yönetimi geliştirmesini bloklamaz.

## Technical evidence

- Sprint 7.1 merged through PR #247: `deepmerge-ts@8.0.1` is pinned through npm overrides and the temporary HIGH advisory allowance is removed.
- Sprint 7.2 merged through PR #248: new writer-initiated legacy `PublisherSubmission` creation is retired while historical lifecycle data and operations remain available.
- Sprint 7.3 merged through PR #249: production UAT matrix and executable role/workflow contracts are in CI.
- Sprint 7.4 closure readiness gate merged through PR #250.
- Writer production UAT evidence was recorded through PR #260; all seven Writer matrix rows are `HUMAN_PASS`.
- UAT sırasında bulunan feedback/navigation regressions were fixed through the small corrective PR chain #253, #255, #256, #257, #258 and #259.
- Latest technical baseline before this closure record: `b172dc4b3c32ffda4770855fd7b35e697f5f9b5f`.
- The standard CI exercises strict dependency audit, lint, security contracts, disposable MariaDB, DB security contracts, strict release measurement, fresh DB recovery, strict measurement on the recovered DB, and production build.

## Closure semantics

Sprint 7'nin **teknik geliştirme kapsamı kapalıdır**. `docs/sprint-7-production-uat.md` içindeki tamamlanmamış Reader, Editor, Publisher, Admin/CMS ve cross-role satırları Final Release UAT backlog'unda kalır.

`npm run release:sprint7:status` ve `npm run release:sprint7:close` komutları kaldırılmamıştır. Strict `release:sprint7:close` kapısı 33/33 human pass olmadan başarısız olmaya devam eder ve artık **nihai release kabul kapısı** olarak değerlendirilir; teknik Sprint 8 geliştirmesini engellemez.

## Deferred Final Release UAT

- Writer: 7/7 `HUMAN_PASS`.
- Reader: final release öncesinde gerçek production hesabıyla tamamlanacak.
- Editor: final release öncesinde gerçek production hesabıyla tamamlanacak.
- Publisher: final release öncesinde gerçek production hesabıyla tamamlanacak.
- Admin/CMS: final release öncesinde gerçek production hesabıyla tamamlanacak.
- Cross-role negative checks: final release öncesinde tamamlanacak.

Her `BLOCKED` insan kabul satırı yine küçük, ayrı corrective PR ile düzeltilecek ve CI + Production Smoke'tan geçirilecektir. Kimlik bilgileri, session/cookie/token veya PII issue/CI/fixture içine kopyalanmayacaktır.

## Handoff

Sprint 7 issue #246 teknik kapsam tamamlandı olarak kapatılır. Sonraki ürün geliştirme sprinti **Sprint 8 — `/icerik` İçerik Yönetimi**'dir. Kalan insan kabul işleri Sprint 8 kapsamına karıştırılmadan ayrı Final Release UAT backlog'unda tutulur.
