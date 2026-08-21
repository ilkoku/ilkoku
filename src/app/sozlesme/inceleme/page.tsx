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
  const ownerDecisionCount = mapped.reduce(
    (total, row) => total + (row.readiness?.ownerDecisionItems.length ?? 0),
    0,
  );
  const legalOnlyCount = mapped.filter((row) => row.readiness?.reviewState === "legal_review").length;
  const productDecisionCount = mapped.filter((row) => row.readiness?.reviewState === "product_decision").length;
  const commercialDecisionCount = mapped.filter((row) => row.readiness?.reviewState === "commercial_decision").length;

  return (
    <main className="contract-review-page">
      <header className="contract-library-hero">
        <div>
          <p>SÖZLEŞME İNCELEME MASASI</p>
          <h1>Aktivasyon öncesi karar ve inceleme kuyruğu</h1>
          <p>
            Teknik geliştirme tamamlandı. Bu ekran çalışma şablonlarının neden henüz aktif olmadığını ayırır:
            hukuki inceleme, ürün kararı veya ticari model. Buradaki hiçbir sınıflandırma şablonu otomatik onaylamaz ya da aktive etmez.
          </p>
        </div>
        <Link href="/sozlesme/sablonlar">Şablon Kütüphanesi →</Link>
      </header>

      <section className="contract-review-summary" aria-label="Sözleşme inceleme özeti">
        <article><strong>{mapped.length}/{contractReviewReadiness.length}</strong><span>Sınıflandırılan LIB şablonu</span></article>
        <article><strong>{legalOnlyCount}</strong><span>Yalnız hukuki inceleme</span></article>
        <article><strong>{productDecisionCount}</strong><span>Ürün kararı gerekiyor</span></article>
        <article><strong>{commercialDecisionCount}</strong><span>Ticari model gerekiyor</span></article>
        <article><strong>{ownerDecisionCount}</strong><span>Ürün sahibi karar maddesi</span></article>
      </section>

      <section className="contract-review-owner-decisions" aria-labelledby="owner-decisions-title">
        <div>
          <p>AYRI KARAR LİSTESİ</p>
          <h2 id="owner-decisions-title">Ürün sahibinden karar bekleyen maddeler</h2>
          <span>Bu maddeler teknik geliştirmeyi durdurmaz; yalnız ilgili şablonun aktivasyonunu bekletir.</span>
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
                <h3>Ürün sahibi kararı</h3>
                {readiness?.ownerDecisionItems.length ? (
                  <ul>{readiness.ownerDecisionItems.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : <p>Bu şablon için ayrıca ürün sahibi kararı beklenmiyor.</p>}
              </section>
            </div>

            <footer>
              <span>Aktivasyon: {record.lifecycleStatus === "active" ? "Aktif" : "Bekliyor"}</span>
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
