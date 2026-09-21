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
        <div><dt>Kaydeden</dt><dd>{evidence.reviewerLabel}</dd></div>
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

  const currentAdminApproval = evidence.find(
    (item) => item.templateVersion === template.version && item.evidenceType === "admin_approval",
  );
  const currentLegacyLegalEvidence = evidence.find(
    (item) => item.templateVersion === template.version && item.evidenceType === "legal_review",
  );

  return (
    <section className="contract-review-evidence-panel" aria-labelledby="review-evidence-title">
      <div className="contract-review-evidence-panel__heading">
        <div>
          <p>ADMIN ONAYI</p>
          <h2 id="review-evidence-title">Sürüm v{template.version} aktivasyon onayı</h2>
        </div>
        <span data-ready={currentAdminApproval ? "true" : "false"}>
          {currentAdminApproval ? "Admin Onayı kayıtlı" : "Admin Onayı bekleniyor"}
        </span>
      </div>

      <p>
        Geçici aktivasyon kuralında şablonun Onaylı aşamasına geçmesi için mevcut sürüme bağlı
        Admin Onayı zorunludur. Hukukçu inceleme kayıtları silinmez ancak aktivasyon dayanağı sayılmaz.
        Metin değişip sürüm yükselirse önceki Admin Onayı geçmişte korunur ve yeni sürüm için yeniden onay gerekir.
      </p>

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
              Mevcut sözleşme sürümünü İlkOku admin yetkisiyle onay sürecine aldığımı ve bu kaydın hukukçu incelemesi veya hukuki görüş olmadığını kabul ediyorum.
            </span>
          </label>
          <button type="submit">Admin Onayını kaydet</button>
        </form>
      ) : (
        <div className="contract-review-evidence-waiting">
          Admin Onayı, şablon İncelemede aşamasındayken kaydedilir.
        </div>
      )}

      {currentLegacyLegalEvidence ? (
        <div className="contract-review-evidence-waiting">
          Bu sürüm için geçmiş bir hukukçu inceleme kaydı mevcut. Kayıt tarihçe olarak korunur; mevcut geçici politikada Onaylı aşamasına geçiş için Admin Onayı yerine kullanılamaz.
        </div>
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
