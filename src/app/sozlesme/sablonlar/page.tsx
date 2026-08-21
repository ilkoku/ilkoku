import Link from "next/link";
import { listContractTemplates } from "@/features/contracts/repository";

export default async function ContractTemplateLibraryPage() {
  const templates = await listContractTemplates({ includeInactive: true });
  const active = templates.filter((template) => template.active).length;

  return (
    <main className="contract-template-library-page">
      <section className="contract-admin-section">
        <div className="contract-card-heading">
          <div>
            <p>ŞABLON KÜTÜPHANESİ</p>
            <h1>Tüm sözleşme şablonları</h1>
          </div>
          <Link href="/sozlesme/sablonlar/yeni">+ Yeni şablon</Link>
        </div>
        <p className="contract-section-copy">
          {templates.length} şablon · {active} aktif · {templates.length - active} pasif. Pasif soft taslaklar hukuki ve ticari inceleme tamamlanmadan gönderim ekranına girmez.
        </p>

        <div className="contract-template-grid">
          {templates.map((template) => (
            <Link
              className="contract-template-card"
              data-active={template.active ? "true" : "false"}
              href={`/sozlesme/sablonlar/${template.id}`}
              key={template.id}
            >
              <div>
                <span>{template.targetRole === "any" ? "Tüm roller" : template.targetRole}</span>
                <span>v{template.version}</span>
              </div>
              <h3>{template.title}</h3>
              <p>{template.description ?? "Açıklama yok"}</p>
              <small>{template.active ? "Aktif" : "Pasif / taslak"} · {template.code}</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
