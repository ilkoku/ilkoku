import Link from "next/link";
import {
  createContractTemplateAction,
  updateContractTemplateAction,
} from "./actions";
import type { ContractTemplateRecord } from "./types";

const roles = [
  ["any", "Tüm roller"],
  ["writer", "Yazar"],
  ["editor", "Editör"],
  ["publisher", "Yayınevi"],
  ["reader", "Okuyucu"],
  ["editor_pending", "Editör adayı"],
  ["admin", "Admin"],
] as const;

export function ContractTemplateForm({
  template = null,
  returnHref = "/sozlesme/sablonlar",
}: {
  template?: ContractTemplateRecord | null;
  returnHref?: string;
}) {
  const editing = Boolean(template);

  return (
    <form action={editing ? updateContractTemplateAction : createContractTemplateAction} className="contract-template-form">
      {template ? <input type="hidden" name="templateId" value={template.id} /> : null}

      <div className="contract-card-heading">
        <div>
          <p>{editing ? "ŞABLON DÜZENLE" : "YENİ ŞABLON"}</p>
          <h2>{editing ? template?.title : "Sözleşme örneği oluştur"}</h2>
        </div>
        {template ? <span>v{template.version}</span> : null}
      </div>

      <div className="contract-template-safety-note">
        Metin düzenleme ile gönderime açma birbirinden ayrıdır. Yeni şablon Taslak olarak oluşur; onaylı veya aktif bir şablonun içeriği değişirse güvenlik için yeniden İncelemede durumuna döner.
      </div>

      <div className="contract-form-grid">
        {!editing ? (
          <label>
            <span>Şablon kodu</span>
            <input name="code" required maxLength={120} placeholder="WRITER_NEW_AGREEMENT" />
            <small>Oluşturulduktan sonra sabit kimlik olarak kullanılır. SOFT_ öneki yalnız Soft Taslaklar için ayrılmıştır.</small>
          </label>
        ) : (
          <label>
            <span>Şablon kodu</span>
            <input value={template?.code ?? ""} readOnly aria-readonly="true" />
          </label>
        )}

        <label>
          <span>Hedef rol</span>
          <select name="targetRole" defaultValue={template?.targetRole ?? "any"} required>
            {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="contract-form-span-2">
          <span>Başlık</span>
          <input name="title" required maxLength={220} defaultValue={template?.title ?? ""} />
        </label>

        <label className="contract-form-span-2">
          <span>Kısa açıklama</span>
          <textarea name="description" maxLength={500} rows={3} defaultValue={template?.description ?? ""} />
        </label>

        <label className="contract-form-span-2">
          <span>Sözleşme metni</span>
          <textarea name="body" required maxLength={100000} rows={24} defaultValue={template?.body ?? ""} />
          <small>Kullanılabilir alanlar: {"{{ad_soyad}}"}, {"{{eposta}}"}, {"{{rol}}"}, {"{{tarih}}"}, {"{{eser}}"}</small>
        </label>
      </div>

      <div className="contract-template-actions">
        <Link href={returnHref}>Vazgeç</Link>
        <button type="submit">{editing ? "Metni kaydet" : "Taslak şablon oluştur"}</button>
      </div>
    </form>
  );
}
