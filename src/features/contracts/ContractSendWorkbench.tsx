"use client";

import { useMemo, useState } from "react";
import { sendContractFromAdminAction } from "./actions";
import type {
  ContractRecipientRecord,
  ContractTargetRole,
  ContractTemplateRecord,
  ContractWorkRecord,
} from "./types";

const roleLabels: Record<ContractTargetRole, string> = {
  admin: "Admin",
  any: "Tüm roller",
  editor: "Editör",
  editor_pending: "Editör adayı",
  publisher: "Yayınevi",
  reader: "Okuyucu",
  writer: "Yazar",
};

export function ContractSendWorkbench({
  recipients,
  templates,
  works,
}: {
  recipients: ContractRecipientRecord[];
  templates: ContractTemplateRecord[];
  works: ContractWorkRecord[];
}) {
  const initialRole = recipients.some((recipient) => recipient.role === "writer")
    ? "writer"
    : recipients[0]?.role ?? "reader";
  const [role, setRole] = useState<string>(initialRole);
  const [userQuery, setUserQuery] = useState("");

  const filteredRecipients = useMemo(() => {
    const needle = userQuery.trim().toLocaleLowerCase("tr-TR");
    return recipients.filter((recipient) => {
      if (recipient.role !== role) return false;
      if (!needle) return true;
      return `${recipient.fullName} ${recipient.displayName ?? ""} ${recipient.email}`
        .toLocaleLowerCase("tr-TR")
        .includes(needle);
    });
  }, [recipients, role, userQuery]);

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.targetRole === "any" || template.targetRole === role),
    [role, templates],
  );

  const roles = useMemo(
    () => [...new Set(recipients.map((recipient) => recipient.role))],
    [recipients],
  );

  return (
    <form action={sendContractFromAdminAction} className="contract-send-card">
      <div className="contract-card-heading">
        <div>
          <p>YENİ GÖNDERİM</p>
          <h2>Rol ve kullanıcıya sözleşme gönder</h2>
        </div>
        <span>Admin kontrollü</span>
      </div>

      <div className="contract-form-grid">
        <label>
          <span>1. Rol</span>
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            {roles.map((item) => (
              <option key={item} value={item}>{roleLabels[item]}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Kullanıcı ara</span>
          <input
            type="search"
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
            placeholder="Ad veya e-posta"
          />
        </label>

        <label className="contract-form-span-2">
          <span>2. Kullanıcı</span>
          <select name="recipientUserId" required defaultValue="">
            <option value="" disabled>Kullanıcı seçin</option>
            {filteredRecipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.displayName || recipient.fullName} · {recipient.email}
              </option>
            ))}
          </select>
          <small>{filteredRecipients.length} aktif kullanıcı</small>
        </label>

        <label className="contract-form-span-2">
          <span>3. Sözleşme şablonu</span>
          <select name="templateId" required defaultValue="">
            <option value="" disabled>Şablon seçin</option>
            {filteredTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title} · v{template.version}
              </option>
            ))}
          </select>
          <small>Seçilen role uygun şablonlar gösteriliyor.</small>
        </label>

        <label className="contract-form-span-2">
          <span>İlgili eser — isteğe bağlı</span>
          <select name="relatedWorkId" defaultValue="">
            <option value="">Eser bağlantısı yok</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>{work.title}</option>
            ))}
          </select>
        </label>

        <label className="contract-form-span-2">
          <span>Admin notu — isteğe bağlı</span>
          <textarea name="adminNote" maxLength={5000} rows={4} placeholder="Bu gönderime özel iç açıklama..." />
        </label>
      </div>

      <div className="contract-send-footer">
        <p>
          Gönderildiği anda şablonun o anki sürümü değişmez sözleşme kopyasına dönüşür ve kullanıcının Sözleşme Yönetimi kutusuna düşer.
        </p>
        <button type="submit">Sözleşmeyi gönder</button>
      </div>
    </form>
  );
}
