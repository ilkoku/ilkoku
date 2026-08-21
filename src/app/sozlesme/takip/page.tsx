import Link from "next/link";
import { listAdminUserContracts } from "@/features/contracts/repository";
import { MANDATORY_REGISTRATION_CONTRACT_CODE } from "@/features/contracts/registration-agreement";
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

export default async function ContractTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ akis?: string; q?: string }>;
}) {
  const params = await searchParams;
  const contracts = await listAdminUserContracts(500);
  const registration = contracts.filter((contract) => contract.templateCode === MANDATORY_REGISTRATION_CONTRACT_CODE);
  const manual = contracts.filter((contract) => contract.templateCode !== MANDATORY_REGISTRATION_CONTRACT_CODE);
  const waiting = manual.filter((contract) => contract.status === "sent" || contract.status === "viewed");
  const accepted = manual.filter((contract) => contract.status === "accepted");
  const rejected = manual.filter((contract) => contract.status === "rejected");
  const cancelled = manual.filter((contract) => contract.status === "cancelled");

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
          <p>Manuel gönderimleri, kullanıcı görüntüleme ve kararlarını, iptalleri ve kayıt sırasında oluşan temel sözleşme kabullerini birbirine karıştırmadan izleyin.</p>
        </div>
        <nav><Link href="/sozlesme">← Genel bakış</Link></nav>
      </header>

      <section className="contract-metrics" aria-label="Takip özeti">
        <article><strong>{manual.length}</strong><span>Manuel operasyon</span></article>
        <article><strong>{waiting.length}</strong><span>Yanıt bekliyor</span></article>
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
            <thead><tr><th>Sözleşme</th><th>Kaynak</th><th>Kullanıcı</th><th>Rol</th><th>Eser</th><th>Durum</th><th>Son işlem</th></tr></thead>
            <tbody>{filtered.map((contract) => {
              const isRegistration = contract.templateCode === MANDATORY_REGISTRATION_CONTRACT_CODE;
              return <tr key={contract.id}>
                <td><Link href={`/sozlesme/${contract.id}`}><strong>{contract.titleSnapshot}</strong><small>{contract.templateCode} · v{contract.templateVersion}</small></Link></td>
                <td>{isRegistration ? "Kayıt sistemi" : "Manuel admin"}</td>
                <td><strong>{contract.recipientFullName}</strong><small>{contract.recipientEmail}</small></td>
                <td>{contract.recipientRole}</td>
                <td>{contract.relatedWorkTitle ?? "—"}</td>
                <td><span className="contract-status" data-status={contract.status}>{statusLabels[contract.status]}</span></td>
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
