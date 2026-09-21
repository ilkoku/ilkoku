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

function EvidenceCard({
  evidence,
  title,
}: {
  evidence: ContractTemplateReviewEvidenceRecord;
  title: string;
}) {
  return (
    <article className="contract-review-evidence-current">
      <strong>{title}</strong>
      <dl>
        <div><dt>Kaydeden / inceleyen</dt><dd>{evidence.reviewerLabel}</dd></div>
        <div><dt>Kayıt zamanı</dt><dd>{formatDate(evidence.createdAt)}</dd></div>
        <div><dt>Sürüm</dt><dd>v{evidence.templateVersion}</dd></div>
      </dl>
      <p>{evidence.note}</p>
    </article>
  );
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
  const currentAdminApproval = evidence.find(
    (item) => item.templateVersion === template.version && item.evidenceType === "admin_approval",
  );
  const hasCurrentApprovalEvidence = Boolean(currentLegalEvidence || currentAdminApproval);

  return (
    <section className="contract-review-evidence-panel" aria-labelledby="review-evidence-title">
      <div className="contract-review-evidence-panel__heading">
        <div>
          <p>İNCELEME / ONAY KANITI</p>
          <h2 id="review-evidence-title">Sürüm v{template.version} aktivasyon dayanağı</h2>
        </div>
        <span data-ready={hasCurrentApprovalEvidence ? "true" : "false"}>
          {hasCurrentApprovalEvidence ? "Onay dayanağı kayıtlı" : "Onay dayanağı bekleniyor"}
        </span>
      </div>

      <p>
        Şablonun Onaylı aşamasına geçmesi için mevcut sürüme bağlı en az bir kayıt gerekir:
        hukukçu inceleme kanıtı veya açık Admin Onayı. Admin Onayı hukukçu incelemesi ya da hukuki görüş değildir;
        sistemde ayrı kanıt türü olarak tutulur. Metin değişip sürüm yükselirse eski kayıt geçmişte korunur ancak yeni sürümü onaylamaz.
      </p>

      {currentLegalEvidence ? (
        <EvidenceCard evidence={currentLegalEvidence} title="Hukukçu inceleme kanıtı" />
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

      {currentAdminApproval ? (
        <EvidenceCard evidence={currentAdminApproval} title="Admin Onayı" />
      ) : template.lifecycleStatus === "review" ? (
        <form action={recordContractTemplateReviewEvidenceAction} className="contract-review-evidence-form">
          <input type="hidden" name="templateId" value={template.id} />
          <input type="hidden" name="evidenceType" value="admin_approval" />
          <label>
            <span>Admin onay notu</span>
            <textarea
              name="note"
              maxLength={5000}
              required
              rows={5}
              placeholder="Bu sürümü neden ve hangi kapsamda admin yetkisiyle onayladığınızı kaydedin."
            />
          </label>
          <label>
            <input type="checkbox" name="adminApprovalConfirmed" value="confirmed" required />
            <span>
              Bu kaydın hukukçu incelemesi veya hukuki görüş olmadığını; mevcut sözleşme sürümünü İlkOku admin yetkisiyle onay sürecine aldığımı kabul ediyorum.
            </span>
          </label>
          <button type="submit">Admin Onayını kaydet</button>
        </form>
      ) : null}

      {evidence.some((item) => item.templateVersion !== template.version) ? (
        <details className="contract-review-evidence-history">
          <summary>Önceki sürüm inceleme / onay kayıtları</summary>
          <div>
            {evidence
              .filter((item) => item.templateVersion !== template.version)
              .map((item) => (
                <article key={item.id}>
                  <strong>
                    v{item.templateVersion} · {item.evidenceType === "admin_approval" ? "Admin Onayı" : item.reviewerLabel}
                  </strong>
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
