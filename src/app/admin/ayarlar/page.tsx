import { prisma } from "@/lib/prisma";

function configurationState(names: string[]) {
  return names.every((name) => Boolean(process.env[name]));
}

export default async function AdminSettingsPage() {
  const databaseReady = await prisma.user.count({ where: { deletedAt: null } }).then(() => true).catch(() => false);
  const databaseConfigured = configurationState(["DB_HOST", "DB_NAME", "DB_PASSWORD", "DB_USER"]) || Boolean(process.env.DATABASE_URL);
  const siteUrlConfigured = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

  const states = [
    { detail: "Prisma ile gerçek veritabanı sorgusu", label: "Veritabanı bağlantısı", ready: databaseReady },
    { detail: "DB_* veya DATABASE_URL çalışma zamanı yapılandırması", label: "Veritabanı ortamı", ready: databaseConfigured },
    { detail: "NEXT_PUBLIC_SITE_URL tanımı", label: "Uygulama adresi", ready: siteUrlConfigured },
    { detail: "Kod tabanında etkin bir e-posta teslimat servisi bulunmuyor", label: "E-posta teslimatı", ready: false },
  ];

  return <div className="admin-directory-page">
    <header className="admin-page-heading"><div><span className="admin-eyebrow">Sistem görünümü</span><h1>Ayarlar</h1><p>Kaydedilmeyen sahte formlar olmadan mevcut platform ve yapılandırma durumunu görüntüleyin.</p></div></header>
    <section className="admin-settings-grid">{states.map((state) => <article className="admin-panel admin-settings-card" key={state.label}><span className="admin-table-badge" data-status={state.ready ? "active" : "pending"}>{state.ready ? "Hazır" : "Yapılandırma gerekli"}</span><h2>{state.label}</h2><p>{state.detail}</p></article>)}</section>
    <section className="admin-detail-grid"><article className="admin-panel"><h2>Kayıt ve rol politikası</h2><ul className="admin-policy-list"><li>Okur ve yazar rolleri standart kayıt akışında doğrudan atanır.</li><li>Editör rolü yönetici onayı bekler; aday kullanıcı editör adayı durumunda kalır.</li><li>Yayınevi rolü yönetici onayı ve etkin owner üyeliği olmadan atanmaz.</li><li>Admin rolü herkese açık kayıt ekranında sunulmaz.</li><li>Aynı kullanıcı ve rol için ikinci pending başvuru `pendingKey` ile engellenir.</li></ul></article><article className="admin-panel"><h2>Platform bilgileri</h2><dl className="admin-detail-list"><div><dt>Uygulama</dt><dd>İlkOku</dd></div><div><dt>Çalışma ortamı</dt><dd>{process.env.NODE_ENV === "production" ? "Production" : "Development"}</dd></div><div><dt>Kimlik sistemi</dt><dd>Prisma tabanlı özel oturum</dd></div><div><dt>Rol kararları</dt><dd>Admin transaction akışı</dd></div></dl></article></section>
  </div>;
}
