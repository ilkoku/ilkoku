import { permissionLabels, roleLabels, rolePermissions, type PlatformRole } from "@/lib/admin-permissions";

const roleDescriptions: Record<PlatformRole, string> = {
  admin: "Platform genelindeki tüm yönetim, denetim ve yetkilendirme işlemlerini yürütür.",
  publisher: "Eser havuzunu inceler, başvuruları değerlendirir ve yayınevi çalışma alanını yönetir.",
  editor: "Yetkilendirildiği eserlerde editoryal inceleme ve geri bildirim süreçlerini yürütür.",
  writer: "Kendi eserlerini üretir, yönetir ve editör ya da yayınevleriyle paylaşır.",
  reader: "Yayımlanan eserleri keşfeder, okur ve kişisel kütüphanesini yönetir.",
};

const memberCounts: Record<PlatformRole, number> = {
  admin: 3,
  publisher: 28,
  editor: 87,
  writer: 463,
  reader: 2846,
};

const roles = Object.keys(roleLabels) as PlatformRole[];

export default function AdminRolesPage() {
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Erişim yönetimi</span>
          <h1>Rol ve Yetkiler</h1>
          <p>Platform rollerini, erişim sınırlarını ve kritik yönetim izinlerini tek merkezden izleyin.</p>
        </div>
        <div className="admin-heading-actions">
          <button className="admin-button admin-button--ghost">Yetki geçmişi</button>
          <button className="admin-button admin-button--primary">Yeni yönetici davet et</button>
        </div>
      </section>

      <section className="admin-role-summary" aria-label="Rol özeti">
        {roles.map((role) => (
          <article key={role}>
            <span>{roleLabels[role]}</span>
            <strong>{memberCounts[role].toLocaleString("tr-TR")}</strong>
            <small>{rolePermissions[role].length} etkin yetki</small>
          </article>
        ))}
      </section>

      <section className="admin-role-layout">
        <div className="admin-role-cards">
          {roles.map((role) => (
            <article className={`admin-role-card admin-role-card--${role}`} key={role}>
              <div className="admin-role-card__heading">
                <div>
                  <span className="admin-role-card__badge">{role.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <h2>{roleLabels[role]}</h2>
                    <p>{memberCounts[role].toLocaleString("tr-TR")} kullanıcı</p>
                  </div>
                </div>
                <button aria-label={`${roleLabels[role]} rolünü düzenle`}>Düzenle</button>
              </div>
              <p className="admin-role-card__description">{roleDescriptions[role]}</p>
              <div className="admin-role-card__permissions">
                {rolePermissions[role].slice(0, 4).map((permission) => (
                  <span key={permission}>✓ {permissionLabels[permission]}</span>
                ))}
                {rolePermissions[role].length > 4 && <span>+{rolePermissions[role].length - 4} ek yetki</span>}
              </div>
            </article>
          ))}
        </div>

        <aside className="admin-permission-panel">
          <div className="admin-panel__heading">
            <div><span>RBAC matrisi</span><h2>Yetki kapsamı</h2></div>
            <b>{Object.keys(permissionLabels).length}</b>
          </div>
          <div className="admin-permission-list">
            {(Object.entries(permissionLabels) as [keyof typeof permissionLabels, string][]).map(([permission, label]) => (
              <div key={permission}>
                <div><strong>{label}</strong><small>{permission}</small></div>
                <span>{roles.filter((role) => rolePermissions[role].includes(permission)).length} rol</span>
              </div>
            ))}
          </div>
          <div className="admin-security-note">
            <strong>Güvenlik ilkesi</strong>
            <p>Yönetici erişimi yalnızca Supabase Auth içindeki güvenilir <code>app_metadata.role=admin</code> veya <code>is_admin=true</code> claim’i ile verilir.</p>
          </div>
        </aside>
      </section>
    </>
  );
}
