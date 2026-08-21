import Link from "next/link";
import { listAdminUserContracts } from "@/features/contracts/repository";
import { MANDATORY_REGISTRATION_CONTRACT_CODE } from "@/features/contracts/registration-agreement";
import { listContractReminderActivity } from "@/features/contracts/tracking-activity";
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
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function waitingAge(sentAt: Date | null, status: UserContractStatus, now: Date) {
  if (!sentAt || (status !== "sent" && status !== "viewed")) return "—";
  const elapsedMs = Math.max(0, now.getTime() - sentAt.getTime());
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
  if (hours < 1) return "< 1 saat";
  if (hours < 24) return `${hours} saat`;
  return `${Math.floor(hours / 24)} gün`;
}

export default async function ContractTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ akis?: string; q?: string }>;
}) {
  const params = await searchParams;
  const [contracts, reminderActivity] = await Promise.all([
    listAdminUserContracts(500),
    listContractReminderActivity(500),
  ]);
  const reminderByContract = new Map(reminderActivity.map((row) => [row.contractId, row]));
  const now = new Date();

  const registration = contracts.filter((contract) => contract.templateCode === MANDATORY_REGISTRATION_CONTRACT_CODE);
  const manual = contracts.filter((contract) => contract.templateCode !== MANDATORY_REGISTRATION_CONTRACT_CODE);
  const waiting = manual.filter((contract) => contract.status === "sent" || contract.status === "viewed");
  const accepted = manual.filter((contract) => contract.status === "accepted");
  const rejected = manual.filter((contract) => contract.status === "rejected");
  const cancelled = manual.filter((contract) => contract.status === "cancelled");
  const unopened = waiting.filter((contract) => !contract.viewedAt);
  const reminded = waiting.filter((contract) => reminderByContract.has(contract.id));

  const flow = params.akis ?? "manual";
  const source = flow === "registration"
    ? registration
    : flow === "waiting"
      ? waiting
      : flow === "accepted"
        ? accepted
        : flow === "rejected"
          ? rejected
          : flow === "cancelled"
            ? cancelled
            : manual;
  const query = (params.q ?? "").trim().toLocaleLowerCase("tr-TR");
  const filtered = query
    ? source.filter((contract) => `${contract.titleSnapshot} ${contract.templateCode} ${contract.recipientFullName} ${contract.recipientEmail} ${contract.relatedWorkTitle ?? ""}`.toLocaleLowerCase("tr-TR").includes(query))
    : source;

  return (
    <main className="contract-admin-page">
      <header className="contract-admin-hero">
        <div>
          <p className="contract-eyebrow">OPERASYON TAKİBİ</p>
          <h1>Sözleşme Takip Merkezi</h1>
          <p>Manuel gönderimleri, kullanıcı görüntüleme ve kararlarını, hatırlatmaları, iptalleri ve kayıt sırasında oluşan temel sözleşme kabullerini birbirine karıştırmadan izleyin.</p>
        </div>
        <nav><Link href="/sozlesme">← Genel bakış</Link></nav>
      </header>

      <section className="contract-metrics" aria-label="Takip özeti">
        <article><strong>{manual.length}</strong><span>Manuel operasyon</span></article>
        <article><strong>{waiting.length}</strong><span>Yanıt bekliyor</span></article>
        <article><strong>{unopened.length}</strong><span>Henüz açılmadı</span></article>
        <article><strong>{reminded.length}</strong><span>Hatırlatma yapıldı</span></article>
        <article><strong>{accepted.length}</strong><span>Manuel kabul</span></article>
        <article><strong>{rejected.length}</strong><span>Manuel ret</span></article>
        <article><strong>{cancelled.length}</strong><span>İptal</span></article>
        <article><strong>{registration.length}</strong><span>Kayıt kabulü</span></article>
      </section>

      <section className="contract-admin-section">
        <div className="contract-card-heading">
          <div><p>FİLTRE</p><h2>İşlem kuyruğu</h2></div>
          <span>{filtered.length} kayıt</span>
        </div>
        <form className="contract-tracking-filters" method="get">
          <label><span>Akış</span><select name="akis" defaultValue={flow}>
            <option value="manual">Tüm manuel sözleşmeler</option>
            <option value="waiting">Yanıt bekleyenler</option>
            <option value="accepted">Kabul edilenler</option>
            <option value="rejected">Reddedilenler</option>
            <option value="cancelled">İptal edilenler</option>
            <option value="registration">Kayıt sözleşmesi kabulleri</option>
          </select></label>
          <label><span>Ara</span><input name="q" type="search" defaultValue={params.q ?? ""} placeholder="Kullanıcı, e-posta, eser veya şablon" /></label>
          <button type="submit">Filtrele</button>
          <Link href="/sozlesme/takip">Temizle</Link>
        </form>

        <div className="contract-table-wrap">
          <table>
            <thead><tr><th>Sözleşme</th><th>Kullanıcı</th><th>Eser</th><th>Durum</th><th>Bekleme</th><th>Görüntülenme</th><th>Son hatırlatma</th><th>Son işlem</th></tr></thead>
            <tbody>{filtered.map((contract) => {
              const reminder = reminderByContract.get(contract.id);
              const pending = contract.status === "sent" || contract.status === "viewed";
              return <tr key={contract.id}>
                <td><Link href={`/sozlesme/${contract.id}`}><strong>{contract.titleSnapshot}</strong><small>{contract.templateCode} · v{contract.templateVersion} · {contract.templateCode === MANDATORY_REGISTRATION_CONTRACT_CODE ? "Kayıt sistemi" : "Manuel admin"}</small></Link></td>
                <td><strong>{contract.recipientFullName}</strong><small>{contract.recipientEmail} · {contract.recipientRole}</small></td>
                <td>{contract.relatedWorkTitle ?? "—"}</td>
                <td><span className="contract-status" data-status={contract.status}>{statusLabels[contract.status]}</span></td>
                <td>{waitingAge(contract.sentAt, contract.status, now)}</td>
                <td>{contract.viewedAt ? <><strong>Açıldı</strong><small>{formatDate(contract.viewedAt)}</small></> : pending ? "Henüz açılmadı" : "—"}</td>
                <td>{reminder ? <><strong>{formatDate(reminder.lastReminderAt)}</strong><small>{reminder.reminderCount} hatırlatma</small></> : "—"}</td>
                <td>{formatDate(contract.updatedAt)}</td>
              </tr>;
            })}</tbody>
          </table>
          {filtered.length === 0 ? <div className="contract-empty">Bu filtrede sözleşme kaydı yok.</div> : null}
        </div>
      </section>
    </main>
  );
}
