import { recordContractTemplateReviewEvidenceAction } from "./actions";
import type { ContractTemplateReviewEvidenceRecord } from "./review-evidence";
import type { ContractTemplateWorkbenchRecord } from "./template-lifecycle";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export function ContractTemplateReviewEvidencePanel({
  evidence,
  template,
}: {
  evidence: ContractTemplateReviewEvidenceRecord[];
  template: ContractTemplateWorkbenchRecord;
}) {
  if (template.lifecycleStatus === "soft") return null;

  const currentLegalEvidence = evidence.find(
    (item) => item.templateVersion === template.version && item.evidenceType === "legal_review",
  );

  return (
    <section className="contract-review-evidence-panel" aria-labelledby="review-evidence-title">
      <div className="contract-review-evidence-panel__heading">
        <div>
          <p>İNCELEME KANITI</p>
          <h2 id="review-evidence-title">Sürüm v{template.version} hukukçu kontrolü</h2>
        </div>
        <span data-ready={currentLegalEvidence ? "true" : "false"}>
          {currentLegalEvidence ? "Kanıt kayıtlı" : "Kanıt bekleniyor"}
        </span>
      </div>

      <p>
        Onay kapısı yalnız bu şablonun mevcut sürümüne ait hukukçu inceleme kanıtını kabul eder.
        Metin değişip sürüm yükselirse eski kanıt geçmiş kayıt olarak korunur ancak yeni sürümü onaylamaz.
      </p>

      {currentLegalEvidence ? (
        <article className="contract-review-evidence-current">
          <dl>
            <div><dt>İnceleyen</dt><dd>{currentLegalEvidence.reviewerLabel}</dd></div>
            <div><dt>Kayıt zamanı</dt><dd>{formatDate(currentLegalEvidence.createdAt)}</dd></div>
            <div><dt>Sürüm</dt><dd>v{currentLegalEvidence.templateVersion}</dd></div>
          </dl>
          <p>{currentLegalEvidence.note}</p>
        </article>
      ) : template.lifecycleStatus === "review" ? (
        <form action={recordContractTemplateReviewEvidenceAction} className="contract-review-evidence-form">
          <input type="hidden" name="templateId" value={template.id} />
          <input type="hidden" name="evidenceType" value="legal_review" />
          <label>
            <span>Hukukçu / inceleyen kişi veya kurum</span>
            <input name="reviewerLabel" maxLength={220} required placeholder="Örn. Av. ... / hukuk bürosu" />
          </label>
          <label>
            <span>İnceleme sonucu / not</span>
            <textarea
              name="note"
              maxLength={5000}
              required
              rows={5}
              placeholder="İncelenen sürüm için hukukçu sonucu, gerekli düzeltmeler veya onay kapsamı"
            />
          </label>
          <button type="submit">Hukukçu inceleme kanıtını kaydet</button>
        </form>
      ) : (
        <div className="contract-review-evidence-waiting">
          Hukukçu kanıtı kaydı, şablon İncelemede aşamasındayken yapılır.
        </div>
      )}

      {evidence.some((item) => item.templateVersion !== template.version) ? (
        <details className="contract-review-evidence-history">
          <summary>Önceki sürüm inceleme kayıtları</summary>
          <div>
            {evidence
              .filter((item) => item.templateVersion !== template.version)
              .map((item) => (
                <article key={item.id}>
                  <strong>v{item.templateVersion} · {item.reviewerLabel}</strong>
                  <span>{formatDate(item.createdAt)}</span>
                  <p>{item.note}</p>
                </article>
              ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
