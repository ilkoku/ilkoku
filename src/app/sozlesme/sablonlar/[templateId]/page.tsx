import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractTemplateForm } from "@/features/contracts/ContractTemplateForm";
import { ContractTemplateLifecyclePanel } from "@/features/contracts/ContractTemplateLifecyclePanel";
import { ContractTemplateReviewEvidencePanel } from "@/features/contracts/ContractTemplateReviewEvidencePanel";
import { getContractTemplate } from "@/features/contracts/repository";
import { listContractTemplateReviewEvidence } from "@/features/contracts/review-evidence";
import { getContractTemplateWorkbenchRecord } from "@/features/contracts/template-lifecycle";

export default async function ContractTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ durum?: string }>;
}) {
  const [{ templateId }, query] = await Promise.all([params, searchParams]);
  // Redirect reason is a display hint, never authorization to approve.
  const reason = query.durum;
  const failureMessage = reason === "purchase_terms_placeholder"
    ? "Admin Onayı kaydı mevcut olabilir; ancak sözleşme metni hâlâ çalışma taslağıdır. Onaylı aşamasına geçilemez. Nihai satın alma şartlarını kaydedin; yeni sürüm için yeniden inceleme ve onay gerekir."
    : reason === "review_evidence_required"
      ? "Bu sürüm için geçerli Admin Onayı bulunamadı. Önce İncelemede aşamasında Admin Onayı kaydedilmeli."
      : reason === "admin_onayi_teyit_gerekli" || reason === "inceleme_kaniti_eksik"
        ? "Admin onay notu ve açık teyit kutusu gereklidir."
        : null;
  const [template, workbenchTemplate, evidence] = await Promise.all([
    getContractTemplate(templateId),
    getContractTemplateWorkbenchRecord(templateId),
    listContractTemplateReviewEvidence(templateId),
  ]);
  if (!template || !workbenchTemplate) notFound();

  const softDraft = workbenchTemplate.lifecycleStatus === "soft";
  const returnHref = softDraft ? "/sozlesme/taslaklar" : "/sozlesme/sablonlar";
  const returnLabel = softDraft ? "Soft Taslaklara dön" : "Şablon Kütüphanesine dön";
  const hasCurrentAdminApproval = evidence.some(
    (item) => item.templateVersion === workbenchTemplate.version && item.evidenceType === "admin_approval",
  );

  return (
    <main className="contract-admin-page contract-editor-page">
      <header className="contract-subpage-header">
        <div>
          <p className="contract-eyebrow">{softDraft ? "SOFT TASLAKLAR" : "ŞABLON KÜTÜPHANESİ"}</p>
          <h1>{template.title}</h1>
          <p>{template.code} · sürüm {template.version}</p>
        </div>
        <Link href={returnHref}>← {returnLabel}</Link>
      </header>

      {failureMessage ? (
        <p role="alert" className="contract-review-evidence-waiting">{failureMessage}</p>
      ) : null}
      <ContractTemplateLifecyclePanel
        template={workbenchTemplate}
        hasCurrentAdminApproval={hasCurrentAdminApproval}
      />
      <ContractTemplateReviewEvidencePanel template={workbenchTemplate} evidence={evidence} />
      <ContractTemplateForm template={template} returnHref={returnHref} />
    </main>
  );
}
