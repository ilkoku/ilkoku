import Link from "next/link";
import { ContractLegalReviewPrintButton } from "@/features/contracts/ContractLegalReviewPrintButton";
import { getContractReviewReadiness } from "@/features/contracts/review-readiness";
import { listContractTemplateWorkbenchRecords } from "@/features/contracts/template-lifecycle";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function ContractLegalReviewPackPage() {
  const records = await listContractTemplateWorkbenchRecords();
  const templates = records
    .filter((record) => record.code.startsWith("LIB_"))
    .sort((a, b) => a.code.localeCompare(b.code, "tr"));

  const pendingOwnerDecisions = templates.reduce(
    (total, template) => total + (getContractReviewReadiness(template.code)?.pendingOwnerDecisionItems.length ?? 0),
    0,
  );
  const resolvedOwnerDecisions = templates.reduce(
    (total, template) => total + (getContractReviewReadiness(template.code)?.ownerDecisionItems.length ?? 0),
    0,
  );

  return (
    <main className="contract-legal-pack-page">
      <header className="contract-legal-pack-header">
        <div>
          <p>HUKUKÇU İNCELEME PAKETİ</p>
          <h1>İlkOku sözleşme şablonları · aktivasyon öncesi inceleme</h1>
          <p>
            Bu paket mevcut çalışma şablonlarını, sürümlerini, tam metinlerini, çözülmüş ürün politikalarını ve açık hukuki inceleme maddelerini tek yerde toplar.
            Hukuki onay veya elektronik imza iddiası değildir; hukukçu inceleme kanıtı ayrıca aynı şablon sürümüne kaydedilir.
          </p>
        </div>
        <div className="contract-legal-pack-actions">
          <ContractLegalReviewPrintButton />
          <Link href="/sozlesme/inceleme">İnceleme Masası →</Link>
        </div>
      </header>

      <section className="contract-legal-pack-summary" aria-label="Hukuk inceleme paketi özeti">
        <article><strong>{templates.length}</strong><span>Çalışma şablonu</span></article>
        <article><strong>{templates.filter((item) => item.lifecycleStatus === "draft").length}</strong><span>Taslak</span></article>
        <article><strong>{resolvedOwnerDecisions}</strong><span>Kaydedilen ürün kararı</span></article>
        <article><strong>{pendingOwnerDecisions}</strong><span>Açık ürün kararı</span></article>
      </section>

      <section className="contract-legal-pack-boundary">
        <strong>İnceleme sınırı</strong>
        <p>
          Bu sayfa salt-okunur bir teslim paketidir. Şablonları Onaylı veya Aktif duruma taşımaz. Metin değişirse sürüm artar ve önceki sürüme ait hukukçu inceleme kanıtı yeni sürümü onaylamak için kullanılamaz.
        </p>
      </section>

      <section className="contract-legal-pack-documents" aria-label="İncelenecek sözleşmeler">
        {templates.map((template, index) => {
          const readiness = getContractReviewReadiness(template.code);
          return (
            <article className="contract-legal-pack-document" key={template.id}>
              <header>
                <div>
                  <small>Belge {index + 1}/{templates.length}</small>
                  <h2>{template.title}</h2>
                  <p>{template.code} · v{template.version} · {template.lifecycleStatus}</p>
                </div>
                <dl>
                  <div><dt>Hedef rol</dt><dd>{template.targetRole}</dd></div>
                  <div><dt>Kaynak</dt><dd>{template.sourceTemplateCode ?? "Manuel"}</dd></div>
                  <div><dt>Son güncelleme</dt><dd>{formatDate(template.updatedAt)}</dd></div>
                </dl>
              </header>

              <section className="contract-legal-pack-review-notes">
                <div>
                  <h3>Hukuki inceleme maddeleri</h3>
                  {readiness?.legalReviewItems.length ? (
                    <ul>{readiness.legalReviewItems.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : <p>Özel inceleme maddesi tanımlanmadı.</p>}
                </div>
                <div>
                  <h3>Kaydedilen ürün politikası</h3>
                  {readiness?.ownerDecisionItems.length ? (
                    <ul>{readiness.ownerDecisionItems.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : <p>Bu belge için ayrıca ürün sahibi kararı gerekmiyor.</p>}
                  {readiness?.pendingOwnerDecisionItems.length ? (
                    <><h3>Açık ürün kararı</h3><ul>{readiness.pendingOwnerDecisionItems.map((item) => <li key={item}>{item}</li>)}</ul></>
                  ) : null}
                </div>
              </section>

              <section className="contract-legal-pack-body" aria-label={`${template.title} tam metin`}>
                <h3>Tam çalışma metni</h3>
                <div>{template.body}</div>
              </section>

              <footer>
                <span>Lifecycle: {template.lifecycleStatus}</span>
                <Link href={`/sozlesme/sablonlar/${template.id}`}>Şablon çalışma masasını aç →</Link>
              </footer>
            </article>
          );
        })}
      </section>
    </main>
  );
}
