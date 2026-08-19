import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { listUserContracts } from "@/features/contracts/repository";
import type { UserContractStatus } from "@/features/contracts/types";

const statusLabels: Record<UserContractStatus, string> = {
  accepted: "Kabul edildi",
  cancelled: "İptal edildi",
  draft: "Taslak",
  rejected: "Reddedildi",
  sent: "Yeni",
  viewed: "Yanıt bekliyor",
};

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function UserContractsPage() {
  const profile = await getCurrentProfile({ ignoreAdminRoleView: true });
  if (!profile) redirect("/giris?sonraki=/sozlesmelerim");

  const contracts = await listUserContracts(profile.id);
  const pending = contracts.filter((contract) => contract.status === "sent" || contract.status === "viewed");
  const completed = contracts.filter((contract) => !["sent", "viewed"].includes(contract.status));

  return (
    <AppShell profile={profile}>
      <div className="dashboard__main user-contracts-page">
        <header className="user-contracts-hero">
          <div>
            <p>SÖZLEŞME YÖNETİMİ</p>
            <h1>Sözleşmelerim</h1>
            <span>İlkOku yönetimi tarafından size gönderilen sözleşmeleri burada inceleyebilir ve yanıtlayabilirsiniz.</span>
          </div>
          <strong>{pending.length} bekleyen</strong>
        </header>

        <section className="user-contracts-section" aria-labelledby="pending-contracts-title">
          <div className="user-contracts-heading">
            <div><p>AKSİYON GEREKLİ</p><h2 id="pending-contracts-title">Bekleyen sözleşmeler</h2></div>
            <span>{pending.length}</span>
          </div>

          <div className="user-contract-list">
            {pending.map((contract) => (
              <Link key={contract.id} href={`/sozlesmelerim/${contract.id}`} className="user-contract-card">
                <div>
                  <span className="user-contract-status" data-status={contract.status}>{statusLabels[contract.status]}</span>
                  <small>{contract.relatedWorkTitle ?? "Genel sözleşme"}</small>
                </div>
                <h3>{contract.titleSnapshot}</h3>
                <p>Gönderim: {formatDate(contract.sentAt)}</p>
                <strong>İncele →</strong>
              </Link>
            ))}
            {pending.length === 0 ? (
              <div className="user-contract-empty"><strong>Bekleyen sözleşmeniz yok.</strong><p>Yeni bir sözleşme gönderildiğinde bu alanda görünecek.</p></div>
            ) : null}
          </div>
        </section>

        <section className="user-contracts-section" aria-labelledby="completed-contracts-title">
          <div className="user-contracts-heading">
            <div><p>GEÇMİŞ</p><h2 id="completed-contracts-title">Tamamlanan sözleşmeler</h2></div>
            <span>{completed.length}</span>
          </div>

          <div className="user-contract-list">
            {completed.map((contract) => (
              <Link key={contract.id} href={`/sozlesmelerim/${contract.id}`} className="user-contract-card" data-completed="true">
                <div>
                  <span className="user-contract-status" data-status={contract.status}>{statusLabels[contract.status]}</span>
                  <small>{contract.relatedWorkTitle ?? "Genel sözleşme"}</small>
                </div>
                <h3>{contract.titleSnapshot}</h3>
                <p>Son işlem: {formatDate(contract.respondedAt ?? contract.updatedAt)}</p>
                <strong>Görüntüle →</strong>
              </Link>
            ))}
            {completed.length === 0 ? <div className="user-contract-empty"><p>Henüz tamamlanmış sözleşme yok.</p></div> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
