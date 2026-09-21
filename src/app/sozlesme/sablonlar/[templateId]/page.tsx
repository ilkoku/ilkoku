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
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const [template, workbenchTemplate, evidence] = await Promise.all([
    getContractTemplate(templateId),
    getContractTemplateWorkbenchRecord(templateId),
    listContractTemplateReviewEvidence(templateId),
  ]);
  if (!template || !workbenchTemplate) notFound();

  const softDraft = workbenchTemplate.lifecycleStatus === "soft";
  const returnHref = softDraft ? "/sozlesme/taslaklar" : "/sozlesme/sablonlar";
  const returnLabel = softDraft ? "Soft Taslaklara dön" : "Şablon Kütüphanesine dön";
  const currentApprovalEvidence = evidence.find(
    (item) =>
      item.templateVersion === workbenchTemplate.version &&
      (item.evidenceType === "legal_review" || item.evidenceType === "admin_approval"),
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

      <ContractTemplateLifecyclePanel
        template={workbenchTemplate}
        currentApprovalEvidenceType={currentApprovalEvidence?.evidenceType ?? null}
      />
      <ContractTemplateReviewEvidencePanel template={workbenchTemplate} evidence={evidence} />
      <ContractTemplateForm template={template} returnHref={returnHref} />
    </main>
  );
}
