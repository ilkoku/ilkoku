"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { sendContractFromAdminAction } from "./actions";
import type {
  ContractActiveAssignmentRecord,
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

function renderPreview(
  template: ContractTemplateRecord,
  recipient: ContractRecipientRecord,
  work: ContractWorkRecord | null,
  date: string,
) {
  const replacements: Record<string, string> = {
    "{{ad_soyad}}": recipient.displayName || recipient.fullName,
    "{{eposta}}": recipient.email,
    "{{rol}}": roleLabels[recipient.role],
    "{{tarih}}": date,
    "{{eser}}": work?.title ?? "—",
  };

  return Object.entries(replacements).reduce(
    (text, [token, replacement]) => text.split(token).join(replacement),
    template.body,
  );
}

export function ContractSendWorkbench({
  activeAssignments,
  recipients,
  templates,
  works,
}: {
  activeAssignments: ContractActiveAssignmentRecord[];
  recipients: ContractRecipientRecord[];
  templates: ContractTemplateRecord[];
  works: ContractWorkRecord[];
}) {
  const roles = useMemo(
    () => [...new Set(recipients.map((recipient) => recipient.role))],
    [recipients],
  );
  const initialRole = recipients.some((recipient) => recipient.role === "writer")
    ? "writer"
    : recipients[0]?.role ?? "reader";

  const [role, setRole] = useState<string>(initialRole);
  const [userQuery, setUserQuery] = useState("");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [relatedWorkId, setRelatedWorkId] = useState("");

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

  const selectedRecipient = useMemo(
    () => recipients.find((recipient) => recipient.id === recipientUserId) ?? null,
    [recipientUserId, recipients],
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? null,
    [templateId, templates],
  );

  const availableWorks = useMemo(() => {
    if (role === "writer" && selectedRecipient) {
      return works.filter((work) => work.authorId === selectedRecipient.id);
    }
    return works;
  }, [role, selectedRecipient, works]);
  const selectedWork = useMemo(
    () => availableWorks.find((work) => work.id === relatedWorkId) ?? null,
    [availableWorks, relatedWorkId],
  );

  const duplicateAssignment = useMemo(() => {
    if (!recipientUserId || !templateId) return null;
    return activeAssignments.find(
      (assignment) =>
        assignment.recipientUserId === recipientUserId &&
        assignment.templateId === templateId &&
        (assignment.relatedWorkId ?? "") === relatedWorkId,
    ) ?? null;
  }, [activeAssignments, recipientUserId, relatedWorkId, templateId]);

  const previewDate = useMemo(
    () => new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "long",
      timeZone: "Europe/Istanbul",
    }).format(new Date()),
    [],
  );
  const previewBody = selectedTemplate && selectedRecipient
    ? renderPreview(selectedTemplate, selectedRecipient, selectedWork, previewDate)
    : null;
  const canSubmit = Boolean(selectedRecipient && selectedTemplate && !duplicateAssignment);

  function resetSelection(nextRole: string) {
    setRole(nextRole);
    setUserQuery("");
    setRecipientUserId("");
    setTemplateId("");
    setRelatedWorkId("");
  }

  function selectRecipient(nextRecipientId: string) {
    setRecipientUserId(nextRecipientId);
    setRelatedWorkId("");
  }

  return (
    <form action={sendContractFromAdminAction} className="contract-send-card contract-send-workbench">
      <div className="contract-card-heading">
        <div>
          <p>SÖZLEŞME ATAMA & GÖNDERİM</p>
          <h2>Kullanıcıyı seç, sözleşmeyi doğrula, önizleyip gönder</h2>
        </div>
        <span>Admin kontrollü · değişmez snapshot</span>
      </div>

      <div className="contract-send-steps" aria-label="Gönderim adımları">
        <span data-ready={Boolean(selectedRecipient)}>1 · Alıcı</span>
        <span data-ready={Boolean(selectedTemplate)}>2 · Şablon</span>
        <span data-ready={Boolean(selectedRecipient && selectedTemplate && !duplicateAssignment)}>3 · Kontrol</span>
        <span data-ready={false}>4 · Gönderim</span>
      </div>

      <div className="contract-assignment-grid">
        <div className="contract-assignment-form">
          <div className="contract-form-grid">
            <label>
              <span>1. Rol</span>
              <select
                value={role}
                onChange={(event) => resetSelection(event.target.value)}
              >
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
              <select
                name="recipientUserId"
                required
                value={recipientUserId}
                onChange={(event) => selectRecipient(event.target.value)}
              >
                <option value="">Kullanıcı seçin</option>
                {filteredRecipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.displayName || recipient.fullName} · {recipient.email}
                  </option>
                ))}
              </select>
              <small>{filteredRecipients.length} aktif kullanıcı · rol değişince seçim sıfırlanır.</small>
            </label>

            <label className="contract-form-span-2">
              <span>3. Sözleşme şablonu</span>
              <select
                name="templateId"
                required
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">Şablon seçin</option>
                {filteredTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} · v{template.version}
                  </option>
                ))}
              </select>
              <small>
                Yalnız aktif ve seçilen role uygun manuel gönderim şablonları gösterilir.
              </small>
            </label>

            <label className="contract-form-span-2">
              <span>İlgili eser — isteğe bağlı</span>
              <select
                name="relatedWorkId"
                value={relatedWorkId}
                onChange={(event) => setRelatedWorkId(event.target.value)}
              >
                <option value="">Eser bağlantısı yok</option>
                {availableWorks.map((work) => (
                  <option key={work.id} value={work.id}>{work.title}</option>
                ))}
              </select>
              <small>
                {role === "writer" && selectedRecipient
                  ? "Yazar seçildiği için yalnız bu yazara ait eserler listeleniyor."
                  : "Eser bağı yalnız sözleşme belirli bir esere ilişkinse kullanılmalıdır."}
              </small>
            </label>

            <label className="contract-form-span-2">
              <span>Admin notu — isteğe bağlı</span>
              <textarea name="adminNote" maxLength={5000} rows={4} placeholder="Bu gönderime özel iç açıklama..." />
            </label>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="contract-dispatch-warning">
              Bu rol için aktif manuel gönderim şablonu yok. Önce Şablon Kütüphanesi&apos;nde bir şablonu inceleyip aktifleştirin.
            </div>
          ) : null}

          {selectedRecipient ? (
            <div className="contract-selection-summary">
              <strong>{selectedRecipient.displayName || selectedRecipient.fullName}</strong>
              <span>{selectedRecipient.email}</span>
              <small>{roleLabels[selectedRecipient.role]}</small>
            </div>
          ) : null}

          {duplicateAssignment ? (
            <div className="contract-duplicate-warning" role="alert">
              <div>
                <strong>Aynı aktif atama zaten var.</strong>
                <p>Bu kullanıcı + şablon + eser birleşimi ikinci kez gönderilemez.</p>
              </div>
              <Link href={`/sozlesme/${duplicateAssignment.contractId}`}>Mevcut sözleşmeyi aç →</Link>
            </div>
          ) : null}
        </div>

        <aside className="contract-send-preview" aria-label="Gönderim önizlemesi">
          <div className="contract-send-preview__head">
            <div>
              <p>GÖNDERİM ÖNİZLEMESİ</p>
              <h3>{selectedTemplate?.title ?? "Şablon seçilmedi"}</h3>
            </div>
            {selectedTemplate ? <span>v{selectedTemplate.version}</span> : null}
          </div>

          {selectedTemplate ? (
            <dl className="contract-preview-meta">
              <div><dt>Kod</dt><dd>{selectedTemplate.code}</dd></div>
              <div><dt>Hedef rol</dt><dd>{roleLabels[selectedTemplate.targetRole]}</dd></div>
              <div><dt>Alıcı</dt><dd>{selectedRecipient ? selectedRecipient.displayName || selectedRecipient.fullName : "—"}</dd></div>
              <div><dt>Eser</dt><dd>{selectedWork?.title ?? "—"}</dd></div>
            </dl>
          ) : null}

          {previewBody ? (
            <div className="contract-preview-document">{previewBody}</div>
          ) : (
            <div className="contract-preview-empty">
              Önizlemeyi oluşturmak için önce kullanıcı ve şablon seçin.
            </div>
          )}
          <small className="contract-preview-note">
            Önizleme yardımcı kontroldür. Gönderim anında sunucu aktif şablonu, kullanıcının güncel rolünü ve eser ilişkisini yeniden doğrular; tarih ve metin o anda snapshot olarak sabitlenir.
          </small>
        </aside>
      </div>

      <div className="contract-send-footer contract-send-footer--confirm">
        <label className="contract-dispatch-confirm">
          <input
            name="dispatchConfirmed"
            required
            type="checkbox"
            value="confirmed"
            disabled={!canSubmit}
          />
          <span>Alıcıyı, şablonu, varsa eser bağını ve önizlenen metni kontrol ettim.</span>
        </label>
        <button type="submit" disabled={!canSubmit}>
          {duplicateAssignment ? "Aktif sözleşme var" : "Sözleşmeyi gönder"}
        </button>
      </div>
    </form>
  );
}
