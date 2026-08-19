import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelContractFromAdminAction } from "@/features/contracts/actions";
import {
  getAdminContract,
  listContractEvents,
} from "@/features/contracts/repository";

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

const eventLabels: Record<string, string> = {
  accepted: "Kullanıcı kabul etti",
  cancelled: "Admin iptal etti",
  rejected: "Kullanıcı reddetti",
  sent: "Admin gönderdi",
  viewed: "Kullanıcı görüntüledi",
};

export default async function AdminContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;
  const [contract, events] = await Promise.all([
    getAdminContract(contractId),
    listContractEvents(contractId),
  ]);
  if (!contract) notFound();

  const cancellable = contract.status === "sent" || contract.status === "viewed";

  return (
    <main className="contract-admin-page contract-editor-page">
      <header className="contract-subpage-header">
        <div>
          <p className="contract-eyebrow">SÖZLEŞME DETAYI</p>
          <h1>{contract.titleSnapshot}</h1>
          <p>{contract.recipientFullName} · {contract.recipientEmail}</p>
        </div>
        <Link href="/sozlesme">← Merkeze dön</Link>
      </header>

      <section className="contract-detail-grid">
        <article className="contract-document-card">
          <div className="contract-card-heading">
            <div><p>GÖNDERİLEN KOPYA</p><h2>Değişmez sözleşme metni</h2></div>
            <span>{contract.status}</span>
          </div>
          <dl className="contract-meta-list">
            <div><dt>Şablon</dt><dd>{contract.templateCode} · v{contract.templateVersion}</dd></div>
            <div><dt>Rol</dt><dd>{contract.recipientRole}</dd></div>
            <div><dt>Eser</dt><dd>{contract.relatedWorkTitle ?? "—"}</dd></div>
            <div><dt>Gönderen</dt><dd>{contract.sentByEmail ?? "—"}</dd></div>
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
          </div>
          <ol className="contract-timeline">
            {events.map((event) => (
              <li key={event.id}>
                <span />
                <div>
                  <strong>{eventLabels[event.eventType] ?? event.eventType}</strong>
                  <p>{event.actorName ?? event.actorEmail ?? "Sistem"}</p>
                  <small>{formatDate(event.createdAt)}</small>
                </div>
              </li>
            ))}
          </ol>

          {cancellable ? (
            <form action={cancelContractFromAdminAction} className="contract-cancel-form">
              <input type="hidden" name="contractId" value={contract.id} />
              <label>
                <span>İptal gerekçesi — isteğe bağlı</span>
                <textarea name="reason" maxLength={1000} rows={3} />
              </label>
              <button type="submit">Aktif sözleşmeyi iptal et</button>
            </form>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
