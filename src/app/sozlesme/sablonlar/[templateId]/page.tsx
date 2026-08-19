import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractTemplateForm } from "@/features/contracts/ContractTemplateForm";
import { getContractTemplate } from "@/features/contracts/repository";

export default async function ContractTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const template = await getContractTemplate(templateId);
  if (!template) notFound();

  return (
    <main className="contract-admin-page contract-editor-page">
      <header className="contract-subpage-header">
        <div>
          <p className="contract-eyebrow">ŞABLON KÜTÜPHANESİ</p>
          <h1>{template.title}</h1>
          <p>{template.code} · sürüm {template.version}</p>
        </div>
        <Link href="/sozlesme">← Merkeze dön</Link>
      </header>
      <ContractTemplateForm template={template} />
    </main>
  );
}
