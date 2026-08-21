import Link from "next/link";
import { ContractTemplateForm } from "@/features/contracts/ContractTemplateForm";

export default function NewContractTemplatePage() {
  return (
    <main className="contract-admin-page contract-editor-page">
      <header className="contract-subpage-header">
        <div>
          <p className="contract-eyebrow">ŞABLON KÜTÜPHANESİ</p>
          <h1>Yeni sözleşme şablonu</h1>
          <p>Bu metin gönderim anında kullanıcıya özel değişmez bir kopyaya dönüşür.</p>
        </div>
        <Link href="/sozlesme/sablonlar">← Şablon Kütüphanesine dön</Link>
      </header>
      <ContractTemplateForm />
    </main>
  );
}
