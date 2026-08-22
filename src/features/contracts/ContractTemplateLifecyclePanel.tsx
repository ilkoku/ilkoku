import {
  convertSoftDraftToTemplateAction,
  transitionContractTemplateAction,
} from "./actions";
import type { ContractTemplateWorkbenchRecord } from "./template-lifecycle";

const lifecycleLabels = {
  soft: "Soft Taslak",
  draft: "Taslak",
  review: "İncelemede",
  approved: "Onaylı",
  active: "Aktif",
} as const;

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function LifecycleButton({
  label,
  templateId,
  transition,
  tone = "default",
}: {
  label: string;
  templateId: string;
  transition: "submit_review" | "approve" | "activate" | "deactivate" | "return_draft";
  tone?: "default" | "primary" | "danger";
}) {
  return (
    <form action={transitionContractTemplateAction}>
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="transition" value={transition} />
      <button type="submit" data-tone={tone}>{label}</button>
    </form>
  );
}

export function ContractTemplateLifecyclePanel({
  hasCurrentLegalEvidence = false,
  template,
}: {
  hasCurrentLegalEvidence?: boolean;
  template: ContractTemplateWorkbenchRecord;
}) {
  if (template.lifecycleStatus === "soft") {
    return (
      <section className="contract-lifecycle-panel" data-status="soft">
        <div className="contract-lifecycle-panel__heading">
          <div>
            <p>SOFT TASLAK SINIRI</p>
            <h2>Kaynak metin — doğrudan gönderilemez</h2>
          </div>
          <span data-status="soft">Soft Taslak</span>
        </div>
        <p>
          Bu kayıt ürün/hukuk çalışma kaynağıdır. Kütüphanede kullanılabilir bir şablon için ayrı çalışma kopyası oluşturulur; kaynak soft taslak değişmeden korunur.
        </p>
        <form action={convertSoftDraftToTemplateAction} className="contract-lifecycle-convert">
          <input type="hidden" name="sourceTemplateId" value={template.id} />
          <button type="submit">Şablon Kütüphanesine çalışma kopyası oluştur</button>
        </form>
      </section>
    );
  }

  return (
    <section className="contract-lifecycle-panel" data-status={template.lifecycleStatus}>
      <div className="contract-lifecycle-panel__heading">
        <div>
          <p>ŞABLON YAŞAM DÖNGÜSÜ</p>
          <h2>{lifecycleLabels[template.lifecycleStatus]}</h2>
        </div>
        <span data-status={template.lifecycleStatus}>{lifecycleLabels[template.lifecycleStatus]}</span>
      </div>

      <ol className="contract-lifecycle-steps" aria-label="Şablon yaşam döngüsü">
        {(["draft", "review", "approved", "active"] as const).map((status, index) => (
          <li
            data-current={template.lifecycleStatus === status ? "true" : "false"}
            data-complete={
              ["draft", "review", "approved", "active"].indexOf(template.lifecycleStatus) >= index
                ? "true"
                : "false"
            }
            key={status}
          >
            <strong>{index + 1}</strong>
            <span>{lifecycleLabels[status]}</span>
          </li>
        ))}
      </ol>

      <dl className="contract-lifecycle-meta">
        <div><dt>Sürüm</dt><dd>v{template.version}</dd></div>
        <div><dt>Hukukçu kanıtı</dt><dd>{hasCurrentLegalEvidence ? "Mevcut sürüm için kayıtlı" : "Bekleniyor"}</dd></div>
        <div><dt>Onay zamanı</dt><dd>{formatDate(template.approvedAt)}</dd></div>
        <div><dt>Aktivasyon</dt><dd>{formatDate(template.activatedAt)}</dd></div>
        <div><dt>Kaynak</dt><dd>{template.sourceTemplateCode ?? "Manuel oluşturuldu"}</dd></div>
      </dl>

      <div className="contract-lifecycle-actions">
        {template.lifecycleStatus === "draft" ? (
          <LifecycleButton label="İncelemeye gönder" templateId={template.id} transition="submit_review" tone="primary" />
        ) : null}
        {template.lifecycleStatus === "review" ? (
          <>
            <LifecycleButton label="Taslağa geri al" templateId={template.id} transition="return_draft" />
            {hasCurrentLegalEvidence ? (
              <LifecycleButton label="Şablonu onayla" templateId={template.id} transition="approve" tone="primary" />
            ) : (
              <span className="contract-lifecycle-evidence-lock">Onay için önce mevcut sürüm hukukçu kanıtını kaydet</span>
            )}
          </>
        ) : null}
        {template.lifecycleStatus === "approved" ? (
          <>
            <LifecycleButton label="Taslağa geri al" templateId={template.id} transition="return_draft" />
            <LifecycleButton label="Gönderime aç / Aktif et" templateId={template.id} transition="activate" tone="primary" />
          </>
        ) : null}
        {template.lifecycleStatus === "active" ? (
          <LifecycleButton label="Gönderimden kaldır" templateId={template.id} transition="deactivate" tone="danger" />
        ) : null}
      </div>

      <p className="contract-lifecycle-footnote">
        Metin, hedef rol veya açıklama değişirse sürüm artar; onaylı/aktif şablon pasife alınarak yeniden İncelemede aşamasına döner ve önceki sürümün hukukçu kanıtı yeni sürümü onaylamaz. Gönderilmiş sözleşmelerin değişmez snapshot&apos;ları etkilenmez.
      </p>
    </section>
  );
}
