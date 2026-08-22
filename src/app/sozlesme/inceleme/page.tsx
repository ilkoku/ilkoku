import Link from "next/link";
import {
  contractReviewReadiness,
  getContractReviewReadiness,
  type ContractReviewState,
} from "@/features/contracts/review-readiness";
import { listContractTemplateWorkbenchRecords } from "@/features/contracts/template-lifecycle";

const reviewStateLabels: Record<ContractReviewState, string> = {
  legal_review: "Hukuki inceleme",
  product_decision: "Ürün kararı + hukuki inceleme",
  commercial_decision: "Ticari model + hukuki inceleme",
};

export default async function ContractReviewReadinessPage() {
  const records = await listContractTemplateWorkbenchRecords();
  const managed = records.filter((record) => record.code.startsWith("LIB_"));
  const rows = managed.map((record) => ({
    record,
    readiness: getContractReviewReadiness(record.code),
  }));

  const mapped = rows.filter((row) => row.readiness !== null);
  const resolvedOwnerDecisionCount = mapped.reduce(
    (total, row) => total + (row.readiness?.ownerDecisionItems.length ?? 0),
    0,
  );
  const pendingOwnerDecisionCount = mapped.reduce(
    (total, row) => total + (row.readiness?.pendingOwnerDecisionItems.length ?? 0),
    0,
  );
  const legalOnlyCount = mapped.filter((row) => row.readiness?.reviewState === "legal_review").length;

  return (
    <main className="contract-review-page">
      <header className="contract-library-hero">
        <div>
          <p>SÖZLEŞME İNCELEME MASASI</p>
          <h1>Aktivasyon öncesi karar ve inceleme kuyruğu</h1>
          <p>
            Ürün politikası kararları ayrı ve sürüm kontrollü tutulur. Kararın çözülmüş olması hukuki onay anlamına gelmez;
            çalışma şablonları gerçek hukukçu incelemesi ve ayrıca lifecycle onayı olmadan gönderime açılamaz.
          </p>
        </div>
        <Link href="/sozlesme/hukuk-inceleme">Hukukçu paketini aç →</Link>
      </header>

      <section className="contract-review-summary" aria-label="Sözleşme inceleme özeti">
        <article><strong>{mapped.length}/{contractReviewReadiness.length}</strong><span>Sınıflandırılan LIB şablonu</span></article>
        <article><strong>{legalOnlyCount}</strong><span>Hukuki inceleme bekleyen</span></article>
        <article><strong>{resolvedOwnerDecisionCount}</strong><span>Kaydedilen ürün kararı</span></article>
        <article><strong>{pendingOwnerDecisionCount}</strong><span>Açık ürün kararı</span></article>
        <article><strong>{mapped.filter((row) => row.record.lifecycleStatus === "active").length}</strong><span>Aktif şablon</span></article>
      </section>

      <section className="contract-review-owner-decisions" aria-labelledby="owner-decisions-title">
        <div>
          <p>ÜRÜN POLİTİKASI</p>
          <h2 id="owner-decisions-title">Ürün sahibi kararları · kaydedildi</h2>
          <span>Bu kararlar hukuki onay değildir. Şablonlar pasif kalır; gerçek hukukçu incelemesi ayrıca kanıtlanır.</span>
        </div>
        <ol>
          {mapped.flatMap(({ record, readiness }) =>
            (readiness?.ownerDecisionItems ?? []).map((item) => (
              <li key={`${record.code}:${item}`}>
                <strong>{record.title}</strong>
                <span>{item}</span>
              </li>
            )),
          )}
        </ol>
      </section>

      {pendingOwnerDecisionCount > 0 ? (
        <section className="contract-review-warning">
          <strong>Açık ürün sahibi kararı var.</strong>
          {mapped.flatMap(({ record, readiness }) =>
            (readiness?.pendingOwnerDecisionItems ?? []).map((item) => (
              <p key={`${record.code}:pending:${item}`}>{record.title}: {item}</p>
            )),
          )}
        </section>
      ) : null}

      <section className="contract-review-grid" aria-label="Şablon inceleme kuyruğu">
        {rows.map(({ record, readiness }) => (
          <article className="contract-review-card" data-review-state={readiness?.reviewState ?? "unmapped"} key={record.id}>
            <header>
              <div>
                <span>{record.lifecycleStatus.toUpperCase()}</span>
                <small>{record.code} · v{record.version}</small>
              </div>
              <strong>{readiness ? reviewStateLabels[readiness.reviewState] : "Manuel sınıflandırma gerekli"}</strong>
            </header>

            <div className="contract-review-card__body">
              <h2>{record.title}</h2>
              <p>{readiness?.summary ?? "Bu çalışma şablonu henüz dokuz kanonik LIB kayıt sınıflandırmasına dahil değil."}</p>

              <section>
                <h3>Hukuki inceleme</h3>
                {readiness?.legalReviewItems.length ? (
                  <ul>{readiness.legalReviewItems.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : <p>Özel hukuki inceleme notu tanımlanmadı.</p>}
              </section>

              <section>
                <h3>Kaydedilen ürün politikası</h3>
                {readiness?.ownerDecisionItems.length ? (
                  <ul>{readiness.ownerDecisionItems.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : <p>Bu şablon için ayrıca ürün sahibi kararı gerekmiyor.</p>}
              </section>
            </div>

            <footer>
              <span>Aktivasyon: {record.lifecycleStatus === "active" ? "Aktif" : "Pasif / inceleme sınırında"}</span>
              <Link href={`/sozlesme/sablonlar/${record.id}`}>Şablonu aç →</Link>
            </footer>
          </article>
        ))}
      </section>

      {rows.length !== contractReviewReadiness.length ? (
        <section className="contract-review-warning">
          <strong>Sınıflandırma ile veritabanı kayıtları eşleşmiyor.</strong>
          <p>Beklenen {contractReviewReadiness.length} LIB şablonu, mevcut {rows.length}. Aktivasyon öncesi kayıt farkı incelenmeli.</p>
        </section>
      ) : null}
    </main>
  );
}
