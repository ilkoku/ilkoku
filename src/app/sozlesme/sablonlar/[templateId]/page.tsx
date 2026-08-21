import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractTemplateForm } from "@/features/contracts/ContractTemplateForm";
import { ContractTemplateLifecyclePanel } from "@/features/contracts/ContractTemplateLifecyclePanel";
import { getContractTemplate } from "@/features/contracts/repository";
import { getContractTemplateWorkbenchRecord } from "@/features/contracts/template-lifecycle";

export default async function ContractTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const [template, workbenchTemplate] = await Promise.all([
    getContractTemplate(templateId),
    getContractTemplateWorkbenchRecord(templateId),
  ]);
  if (!template || !workbenchTemplate) notFound();

  const softDraft = workbenchTemplate.lifecycleStatus === "soft";
  const returnHref = softDraft ? "/sozlesme/taslaklar" : "/sozlesme/sablonlar";
  const returnLabel = softDraft ? "Soft Taslaklara dön" : "Şablon Kütüphanesine dön";

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

      <ContractTemplateLifecyclePanel template={workbenchTemplate} />
      <ContractTemplateForm template={template} returnHref={returnHref} />
    </main>
  );
}
