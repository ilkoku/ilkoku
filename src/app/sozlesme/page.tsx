import Link from "next/link";
import { ContractSendWorkbench } from "@/features/contracts/ContractSendWorkbench";
import {
  listAdminUserContracts,
  listContractRecipients,
  listContractTemplates,
  listContractWorks,
  listLegacyPublisherContracts,
} from "@/features/contracts/repository";
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

function messageForStatus(status: string | undefined) {
  const messages: Record<string, string> = {
    aktif_sozlesme_var: "Aynı kullanıcı, şablon ve eser için zaten aktif bir sözleşme var.",
    duplicate_active: "Aynı aktif sözleşme ikinci kez oluşturulmadı.",
    eksik_bilgi: "Gönderim için rol, kullanıcı ve sözleşme şablonu seçilmelidir.",
    gonderildi: "Sözleşme kullanıcıya gönderildi ve bildirim oluşturuldu.",
    invalid_recipient: "Seçilen kullanıcı aktif değil veya artık gönderime uygun değil.",
    invalid_template: "Sözleşme şablonu aktif/onaylı değil veya bulunamadı.",
    invalid_work: "Seçilen eser bulunamadı veya arşivlenmiş.",
    role_mismatch: "Şablonun rolü ile seçilen kullanıcının güncel rolü uyuşmuyor.",
  };
  return status ? messages[status] ?? status : null;
}

export default async function ContractManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const params = await searchParams;
  const [templates, recipients, works, contracts, legacyContracts] = await Promise.all([
    listContractTemplates({ includeInactive: true }),
    listContractRecipients(),
    listContractWorks(),
    listAdminUserContracts(),
    listLegacyPublisherContracts(),
  ]);

  const operationalTemplates = templates.filter((template) => !template.code.startsWith("SOFT_"));
  const activeTemplates = operationalTemplates.filter((template) => template.active);
  const waiting = contracts.filter((contract) => contract.status === "sent" || contract.status === "viewed").length;
  const accepted = contracts.filter((contract) => contract.status === "accepted").length;
  const rejected = contracts.filter((contract) => contract.status === "rejected").length;
  const message = messageForStatus(params.durum);

  return (
    <main className="contract-admin-page">
      <header className="contract-admin-hero">
        <div>
          <p className="contract-eyebrow">İLKOKU MERKEZİ YÖNETİM</p>
          <h1>Sözleşme Yönetimi</h1>
          <p>
            Şablonları hazırlayın, rol ve kullanıcı seçerek sözleşme gönderin; görüntüleme, kabul, ret ve iptal geçmişini tek merkezden takip edin.
          </p>
        </div>

        <nav aria-label="Sözleşme yönetimi bağlantıları">
          <Link href="/sozlesme/sablonlar/yeni">Yeni şablon</Link>
          <Link href="/harita">Sistem Haritası</Link>
          <Link href="/sistem-yonetimi">Sistem Yönetimi</Link>
        </nav>
      </header>

      {message ? <div className="contract-flash" data-status={params.durum === "gonderildi" ? "success" : "notice"}>{message}</div> : null}

      <section className="contract-metrics" aria-label="Sözleşme özeti">
        <article><strong>{activeTemplates.length}</strong><span>Aktif şablon</span></article>
        <article><strong>{contracts.length}</strong><span>Merkezi sözleşme</span></article>
        <article><strong>{waiting}</strong><span>Yanıt bekliyor</span></article>
        <article><strong>{accepted}</strong><span>Kabul edildi</span></article>
        <article><strong>{rejected}</strong><span>Reddedildi</span></article>
        <article><strong>{legacyContracts.length}</strong><span>Tarihsel yayınevi kaydı</span></article>
      </section>

      <ContractSendWorkbench
        recipients={recipients}
        templates={activeTemplates}
        works={works}
      />

      <section className="contract-admin-section">
        <div className="contract-card-heading">
          <div>
            <p>ŞABLON KÜTÜPHANESİ</p>
            <h2>Operasyon şablonları</h2>
          </div>
          <Link href="/sozlesme/sablonlar">Kütüphaneyi aç →</Link>
        </div>
        <p className="contract-section-copy">
          Soft Taslaklar ayrı çalışma alanında tutulur. Burada yalnız kütüphaneye alınmış operasyon şablonları görünür; gönderim seçiminde ise yalnız aktif olanlar kullanılabilir.
        </p>

        <div className="contract-template-grid">
          {operationalTemplates.map((template) => (
            <Link key={template.id} href={`/sozlesme/sablonlar/${template.id}`} className="contract-template-card" data-active={template.active ? "true" : "false"}>
              <div>
                <span>{template.targetRole === "any" ? "Tüm roller" : template.targetRole}</span>
                <span>v{template.version}</span>
              </div>
              <h3>{template.title}</h3>
              <p>{template.description ?? "Açıklama yok"}</p>
              <small>{template.active ? "Aktif / gönderilebilir" : "Çalışma aşamasında"} · {template.code}</small>
            </Link>
          ))}
        </div>
        {operationalTemplates.length === 0 ? <div className="contract-empty">Henüz kütüphane şablonu yok. Soft Taslaklar&apos;dan çalışma kopyası oluşturabilirsiniz.</div> : null}
      </section>

      <section className="contract-admin-section">
        <div className="contract-card-heading">
          <div>
            <p>CANLI AKIŞ</p>
            <h2>Gönderilen sözleşmeler</h2>
          </div>
          <span>{contracts.length} kayıt</span>
        </div>

        <div className="contract-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sözleşme</th>
                <th>Kullanıcı</th>
                <th>Rol</th>
                <th>Eser</th>
                <th>Durum</th>
                <th>Son işlem</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id}>
                  <td><Link href={`/sozlesme/${contract.id}`}><strong>{contract.titleSnapshot}</strong><small>{contract.templateCode} · v{contract.templateVersion}</small></Link></td>
                  <td><strong>{contract.recipientFullName}</strong><small>{contract.recipientEmail}</small></td>
                  <td>{contract.recipientRole}</td>
                  <td>{contract.relatedWorkTitle ?? "—"}</td>
                  <td><span className="contract-status" data-status={contract.status}>{statusLabels[contract.status]}</span></td>
                  <td>{formatDate(contract.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {contracts.length === 0 ? <div className="contract-empty">Henüz merkezi sözleşme gönderilmedi.</div> : null}
        </div>
      </section>

      <section className="contract-admin-section contract-legacy-section">
        <div className="contract-card-heading">
          <div>
            <p>GEÇMİŞ KAYITLAR</p>
            <h2>Eski yayınevi sözleşmeleri</h2>
          </div>
          <span>Salt okunur tarihçe</span>
        </div>
        <p className="contract-section-copy">
          Yeni sözleşmeler yalnız bu merkezi çalışma masasından gönderilir. Daha önce yayınevi akışında oluşturulan sözleşmeler kaybolmaması için burada salt okunur geçmiş olarak gösterilir.
        </p>

        <div className="contract-table-wrap">
          <table>
            <thead><tr><th>Eser</th><th>Yazar</th><th>Yayınevi</th><th>Sürüm</th><th>Durum</th><th>Güncelleme</th></tr></thead>
            <tbody>
              {legacyContracts.map((contract) => (
                <tr key={contract.id}>
                  <td>{contract.workTitle}</td>
                  <td><strong>{contract.authorName}</strong><small>{contract.authorEmail}</small></td>
                  <td>{contract.publisherName}</td>
                  <td>v{contract.version}</td>
                  <td>{contract.status}</td>
                  <td>{formatDate(contract.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {legacyContracts.length === 0 ? <div className="contract-empty">Tarihsel yayınevi sözleşmesi yok.</div> : null}
        </div>
      </section>
    </main>
  );
}
