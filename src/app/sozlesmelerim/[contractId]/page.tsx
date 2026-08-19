import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { respondToContractAction } from "@/features/contracts/actions";
import {
  getUserContract,
  markUserContractViewed,
} from "@/features/contracts/repository";

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function UserContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const profile = await getCurrentProfile({ ignoreAdminRoleView: true });
  if (!profile) redirect("/giris?sonraki=/sozlesmelerim");

  const { contractId } = await params;
  const initialContract = await getUserContract(contractId, profile.id);
  if (!initialContract) notFound();

  if (initialContract.status === "sent") {
    await markUserContractViewed({ contractId, recipientUserId: profile.id });
  }

  const contract = await getUserContract(contractId, profile.id);
  if (!contract) notFound();
  const actionable = contract.status === "sent" || contract.status === "viewed";

  return (
    <AppShell profile={profile}>
      <div className="dashboard__main user-contract-detail-page">
        <div className="user-contract-detail-nav">
          <Link href="/sozlesmelerim">← Sözleşmelerime dön</Link>
          <span>{contract.status}</span>
        </div>

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
              <span>Karar verildikten sonra bu sürüm terminal duruma geçer; yeni işlem için yönetimin yeni bir sözleşme göndermesi gerekir.</span>
            </div>

            <form action={respondToContractAction}>
              <input type="hidden" name="contractId" value={contract.id} />
              <label>
                <span>Not — isteğe bağlı</span>
                <textarea name="responseNote" maxLength={3000} rows={4} placeholder="Kararınızla ilgili açıklama..." />
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
            <strong>Sözleşme durumu: {contract.status}</strong>
            <p>Bu sözleşme artık yanıt beklemiyor.</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
