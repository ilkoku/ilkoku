import { getEmailDeliveryMode } from "@/lib/email/config";
import { prisma } from "@/lib/prisma";

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

function hasMinimumLength(name: string, minimum: number) {
  return (process.env[name]?.trim().length ?? 0) >= minimum;
}

export default async function AdminSettingsPage() {
  const databaseReady = await prisma.user
    .count({ where: { deletedAt: null } })
    .then(() => true)
    .catch(() => false);

  const databaseConfigured =
    ["DB_HOST", "DB_NAME", "DB_PASSWORD", "DB_USER"].every(hasValue) ||
    hasValue("DATABASE_URL");
  const migrationConfigured = hasValue("DATABASE_URL");
  const siteConfigured =
    hasValue("NEXT_PUBLIC_SITE_URL") && hasValue("SITE_URL");
  const emailMode = getEmailDeliveryMode();
  const emailConfigured =
    emailMode === "smtp" &&
    ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"].every(hasValue);

  const states = [
    {
      detail: "Gerçek Prisma sorgusu başarıyla tamamlanıyor.",
      label: "Veritabanı bağlantısı",
      ready: databaseReady,
    },
    {
      detail: "DB çalışma zamanı yapılandırması tanımlı.",
      label: "Veritabanı ortamı",
      ready: databaseConfigured,
    },
    {
      detail: "Migration işlemleri için DATABASE_URL tanımlı.",
      label: "Migration bağlantısı",
      ready: migrationConfigured,
    },
    {
      detail: "Production uygulama adresleri tanımlı.",
      label: "Uygulama adresi",
      ready: siteConfigured,
    },
    {
      detail:
        emailMode === "smtp"
          ? "SMTP modu ve gerekli bağlantı alanları tanımlı."
          : "Teslimat local outbox modunda.",
      label: "E-posta teslimatı",
      ready: emailConfigured,
    },
    {
      detail: "İmza anahtarı en az 64 karakter.",
      label: "Admin rol görünümü",
      ready: hasMinimumLength("ADMIN_ROLE_VIEW_SECRET", 64),
    },
    {
      detail: "Anonim hash anahtarı en az 64 karakter.",
      label: "Okuma erişimi koruması",
      ready: hasMinimumLength("READING_ACCESS_HASH_SECRET", 64),
    },
    {
      detail: "İç görev anahtarı en az 32 karakter.",
      label: "Zamanlanmış görevler",
      ready: hasMinimumLength("WRITER_DAILY_SUMMARY_SECRET", 32),
    },
  ];

  return (
    <div className="admin-directory-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Sistem görünümü</span>
          <h1>Ayarlar</h1>
          <p>
            Production bağlantılarının ve koruma anahtarlarının hazır olup
            olmadığını görüntüleyin. Gizli değerler gösterilmez.
          </p>
        </div>
      </header>

      <section className="admin-settings-grid">
        {states.map((state) => (
          <article className="admin-panel admin-settings-card" key={state.label}>
            <span
              className="admin-table-badge"
              data-status={state.ready ? "active" : "pending"}
            >
              {state.ready ? "Hazır" : "Yapılandırma gerekli"}
            </span>
            <h2>{state.label}</h2>
            <p>{state.detail}</p>
          </article>
        ))}
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>Rotasyon politikası</h2>
          <ul className="admin-policy-list">
            <li>Her koruma anahtarı birbirinden farklı ve rastgele üretilir.</li>
            <li>Gizli değerler ekran görüntüsünde veya depo dosyasında paylaşılmaz.</li>
            <li>Bağlantı parolaları değiştiğinde ortam ayarları aynı işlem penceresinde güncellenir.</li>
            <li>Değişikliklerden sonra yeniden deploy ve temel akış testi yapılır.</li>
          </ul>
        </article>

        <article className="admin-panel">
          <h2>Platform bilgileri</h2>
          <dl className="admin-detail-list">
            <div><dt>Uygulama</dt><dd>İlkOku</dd></div>
            <div>
              <dt>Çalışma ortamı</dt>
              <dd>{process.env.NODE_ENV === "production" ? "Production" : "Development"}</dd>
            </div>
            <div><dt>Kimlik sistemi</dt><dd>Prisma tabanlı özel oturum</dd></div>
            <div><dt>Oturum saklama</dt><dd>Session tablosunda hash&apos;lenmiş token</dd></div>
            <div><dt>E-posta modu</dt><dd>{emailMode === "smtp" ? "Gerçek SMTP" : "Local outbox"}</dd></div>
          </dl>
        </article>
      </section>
    </div>
  );
}
