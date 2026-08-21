import Link from "next/link";
import { ContractTemplateForm } from "@/features/contracts/ContractTemplateForm";

export default function NewContractTemplatePage() {
  return (
    <main className="contract-admin-page contract-editor-page">
      <header className="contract-subpage-header">
        <div>
          <p className="contract-eyebrow">ŞABLON KÜTÜPHANESİ</p>
          <h1>Yeni sözleşme şablonu</h1>
          <p>
            Yeni kayıt Taslak olarak başlar ve gönderime kapalıdır. Metin hazırlandıktan sonra İncelemede → Onaylı → Aktif yaşam döngüsünden geçirilir; gönderim anında kullanıcıya özel değişmez snapshot oluşturulur.
          </p>
        </div>
        <Link href="/sozlesme/sablonlar">← Şablon Kütüphanesine dön</Link>
      </header>
      <ContractTemplateForm />
    </main>
  );
}
