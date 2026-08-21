import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelContractWithConfirmationAction } from "@/features/contracts/guarded-response-actions";
import {
  getAdminContract,
  listContractEvents,
} from "@/features/contracts/repository";
import {
  MANDATORY_REGISTRATION_CONTRACT_CODE,
} from "@/features/contracts/registration-agreement";
import type { UserContractStatus } from "@/features/contracts/types";

const statusLabels: Record<UserContractStatus, string> = {
  accepted: "Kabul edildi",
  cancelled: "İptal edildi",
  draft: "Taslak",
  rejected: "Reddedildi",
  sent: "Gönderildi",
  viewed: "Görüntülendi",
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function parseMetadata(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function eventLabel(eventType: string, metadata: Record<string, unknown> | null) {
  if (eventType === "accepted" && metadata?.source === "registration") {
    return "Kayıt sırasında temel sözleşme kabul edildi";
  }
  const labels: Record<string, string> = {
    accepted: "Kullanıcı kabul etti",
    cancelled: "Admin iptal etti",
    rejected: "Kullanıcı reddetti",
    sent: "Admin gönderdi",
    viewed: "Kullanıcı görüntüledi",
  };
  return labels[eventType] ?? eventType;
}

function messageForStatus(status: string | undefined) {
  const messages: Record<string, string> = {
    cancelled: "Aktif sözleşme iptal edildi ve olay geçmişine kaydedildi.",
    iptal_onayi_gerekli: "İptal işlemi için açık onay kutusunu işaretlemelisiniz.",
    forbidden: "Bu sözleşme üzerinde işlem yetkiniz bulunmuyor.",
    not_found: "Sözleşme bulunamadı.",
    terminal: "Bu sözleşme artık aktif değil; iptal işlemi uygulanamaz.",
  };
  return status ? messages[status] ?? null : null;
}

export default async function AdminContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contractId: string }>;
  searchParams: Promise<{ durum?: string }>;
}) {
  const [{ contractId }, query] = await Promise.all([params, searchParams]);
  const [contract, events] = await Promise.all([
    getAdminContract(contractId),
    listContractEvents(contractId),
  ]);
  if (!contract) notFound();

  const cancellable = contract.status === "sent" || contract.status === "viewed";
  const isRegistrationContract = contract.templateCode === MANDATORY_REGISTRATION_CONTRACT_CODE;
  const message = messageForStatus(query.durum);

  return (
    <main className="contract-admin-page contract-editor-page">
      <header className="contract-subpage-header">
        <div>
          <p className="contract-eyebrow">SÖZLEŞME DETAYI</p>
          <h1>{contract.titleSnapshot}</h1>
          <p>{contract.recipientFullName} · {contract.recipientEmail}</p>
        </div>
        <Link href="/sozlesme/takip">← Takip merkezine dön</Link>
      </header>

      {message ? (
        <div className="contract-flash" data-status={query.durum === "cancelled" ? "success" : "notice"}>{message}</div>
      ) : null}

      <section className="contract-detail-grid">
        <article className="contract-document-card">
          <div className="contract-card-heading">
            <div><p>DEĞİŞMEZ KOPYA</p><h2>Gönderilen / kabul edilen sözleşme</h2></div>
            <span className="contract-status" data-status={contract.status}>{statusLabels[contract.status]}</span>
          </div>
          <dl className="contract-meta-list">
            <div><dt>Kaynak</dt><dd>{isRegistrationContract ? "Sistem / kayıt kabulü" : "Manuel admin gönderimi"}</dd></div>
            <div><dt>Şablon</dt><dd>{contract.templateCode} · v{contract.templateVersion}</dd></div>
            <div><dt>Rol</dt><dd>{contract.recipientRole}</dd></div>
            <div><dt>Eser</dt><dd>{contract.relatedWorkTitle ?? "—"}</dd></div>
            <div><dt>Gönderen</dt><dd>{contract.sentByEmail ?? (isRegistrationContract ? "Kayıt sistemi" : "—")}</dd></div>
            <div><dt>Gönderim</dt><dd>{formatDate(contract.sentAt)}</dd></div>
            <div><dt>Görüntülenme</dt><dd>{formatDate(contract.viewedAt)}</dd></div>
            <div><dt>Yanıt</dt><dd>{formatDate(contract.respondedAt)}</dd></div>
          </dl>
          {contract.adminNote ? <div className="contract-note"><strong>Admin notu</strong><p>{contract.adminNote}</p></div> : null}
          {contract.responseNote ? <div className="contract-note"><strong>Kullanıcı notu</strong><p>{contract.responseNote}</p></div> : null}
          <pre className="contract-document-text">{contract.bodySnapshot}</pre>
        </article>

        <aside className="contract-timeline-card">
          <div className="contract-card-heading">
            <div><p>AUDIT</p><h2>İşlem geçmişi</h2></div>
            <span>{events.length} olay</span>
          </div>
          <ol className="contract-timeline">
            {events.map((event) => {
              const metadata = parseMetadata(event.metadata);
              const reason = typeof metadata?.reason === "string" ? metadata.reason : null;
              const source = typeof metadata?.source === "string" ? metadata.source : null;
              const templateCode = typeof metadata?.templateCode === "string" ? metadata.templateCode : null;
              const templateVersion = typeof metadata?.templateVersion === "number" ? metadata.templateVersion : null;
              return (
                <li key={event.id}>
                  <span />
                  <div>
                    <strong>{eventLabel(event.eventType, metadata)}</strong>
                    <p>{event.actorName ?? event.actorEmail ?? "Sistem"}</p>
                    {reason ? <p className="contract-timeline__reason">Gerekçe: {reason}</p> : null}
                    {source ? <small>Kaynak: {source}</small> : null}
                    {templateCode ? <small>Şablon: {templateCode}{templateVersion ? ` · v${templateVersion}` : ""}</small> : null}
                    <small>{formatDate(event.createdAt)}</small>
                  </div>
                </li>
              );
            })}
          </ol>

          {cancellable ? (
            <form action={cancelContractWithConfirmationAction} className="contract-cancel-form">
              <input type="hidden" name="contractId" value={contract.id} />
              <label>
                <span>İptal gerekçesi — isteğe bağlı</span>
                <textarea name="reason" maxLength={1000} rows={3} />
              </label>
              <label className="contract-cancel-confirm">
                <input name="cancelConfirmed" required type="checkbox" value="confirmed" />
                <span>Bu sözleşmenin aktif durumunu sonlandırmak istediğimi onaylıyorum.</span>
              </label>
              <button type="submit">Aktif sözleşmeyi iptal et</button>
            </form>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
