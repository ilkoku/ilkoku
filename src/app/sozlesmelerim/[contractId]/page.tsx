import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { ContractViewedMarker } from "@/features/contracts/ContractViewedMarker";
import { respondToContractWithConfirmationAction } from "@/features/contracts/guarded-response-actions";
import { getUserContract } from "@/features/contracts/repository";
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
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function messageForStatus(status: string | undefined) {
  const messages: Record<string, string> = {
    accepted: "Sözleşme kabulünüz kaydedildi.",
    rejected: "Sözleşme ret kararınız kaydedildi.",
    onay_gerekli: "Kabul veya ret kararını göndermeden önce karar onay kutusunu işaretlemelisiniz.",
    gecersiz_islem: "Sözleşme kararı doğrulanamadı.",
    forbidden: "Bu sözleşme için işlem yetkiniz bulunmuyor.",
    not_found: "Sözleşme bulunamadı veya artık hesabınıza ait değil.",
    terminal: "Bu sözleşme daha önce sonuçlandırılmış; tekrar yanıt verilemez.",
  };
  return status ? messages[status] ?? null : null;
}

export default async function UserContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contractId: string }>;
  searchParams: Promise<{ durum?: string }>;
}) {
  const profile = await getCurrentProfile({ ignoreAdminRoleView: true });
  if (!profile) redirect("/giris?sonraki=/sozlesmelerim");

  const [{ contractId }, query] = await Promise.all([params, searchParams]);
  const contract = await getUserContract(contractId, profile.id);
  if (!contract) notFound();

  const actionable = contract.status === "sent" || contract.status === "viewed";
  const message = messageForStatus(query.durum);

  return (
    <AppShell profile={profile}>
      <ContractViewedMarker
        contractId={contract.id}
        shouldMark={contract.status === "sent"}
      />
      <div className="dashboard__main user-contract-detail-page">
        <div className="user-contract-detail-nav">
          <Link href="/sozlesmelerim">← Sözleşmelerime dön</Link>
          <span data-status={contract.status}>{statusLabels[contract.status]}</span>
        </div>

        {message ? (
          <div
            className="user-contract-flash"
            data-status={query.durum === "accepted" ? "success" : query.durum === "rejected" ? "notice" : "warning"}
          >
            {message}
          </div>
        ) : null}

        <article className="user-contract-document">
          <header>
            <p>SÖZLEŞME</p>
            <h1>{contract.titleSnapshot}</h1>
            <div>
              <span>Gönderim: {formatDate(contract.sentAt)}</span>
              <span>Şablon sürümü: v{contract.templateVersion}</span>
              {contract.relatedWorkTitle ? <span>Eser: {contract.relatedWorkTitle}</span> : null}
            </div>
          </header>

          <pre>{contract.bodySnapshot}</pre>

          {contract.adminNote ? (
            <aside><strong>Yönetim notu</strong><p>{contract.adminNote}</p></aside>
          ) : null}

          {contract.responseNote ? (
            <aside><strong>Yanıt notunuz</strong><p>{contract.responseNote}</p></aside>
          ) : null}
        </article>

        {actionable ? (
          <section className="user-contract-response" aria-labelledby="contract-response-title">
            <div>
              <p>YANIT</p>
              <h2 id="contract-response-title">Sözleşme kararınız</h2>
              <span>
                Karar verildikten sonra bu sürüm terminal duruma geçer; yeni işlem için yönetimin yeni bir sözleşme göndermesi gerekir.
              </span>
            </div>

            <form action={respondToContractWithConfirmationAction}>
              <input type="hidden" name="contractId" value={contract.id} />
              <label>
                <span>Not — isteğe bağlı</span>
                <textarea name="responseNote" maxLength={3000} rows={4} placeholder="Kararınızla ilgili açıklama..." />
              </label>
              <label className="user-contract-response-confirm">
                <input name="responseConfirmed" required type="checkbox" value="confirmed" />
                <span>
                  Sözleşme metnini okudum; seçeceğim kabul veya ret kararının İlkOku içinde kalıcı işlem kaydı oluşturacağını anlıyorum.
                </span>
              </label>
              <div className="user-contract-response-actions">
                <button type="submit" name="decision" value="rejected" className="user-contract-reject">Reddet</button>
                <button type="submit" name="decision" value="accepted" className="user-contract-accept">Kabul et</button>
              </div>
              <small>Bu işlem İlkOku içindeki kabul/ret kaydını oluşturur; nitelikli elektronik imza işlemi değildir.</small>
            </form>
          </section>
        ) : (
          <section className="user-contract-final-state">
            <strong>Sözleşme durumu: {statusLabels[contract.status]}</strong>
            <p>Bu sözleşme artık yanıt beklemiyor.</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
