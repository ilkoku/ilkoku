import { requireCmsAdmin } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

type AccessRow = {
  email: string;
  fullName: string;
  displayName: string | null;
  role: string;
  active: boolean;
  canPublish: boolean;
  grantedAt: Date;
  revokedAt: Date | null;
};

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await requireCmsAdmin("/icerik/erisim");
  const params = await searchParams;

  let rows: AccessRow[] = [];
  try {
    rows = await prisma.$queryRaw<AccessRow[]>`
      SELECT u.email, u.fullName, u.displayName, u.role,
             a.active, a.canPublish, a.grantedAt, a.revokedAt
      FROM ContentManagerAccess a
      INNER JOIN User u ON u.id = a.userId
      ORDER BY a.active DESC, a.updatedAt DESC
      LIMIT 200
    `;
  } catch {
    rows = [];
  }

  const messages: Record<string, string> = {
    kaydedildi: "İçerik yöneticisi yetkisi kaydedildi.",
    iptal: "İçerik yöneticisi erişimi iptal edildi.",
    "kullanici-yok": "Bu e-posta ile kayıtlı kullanıcı bulunamadı.",
    admin: "Admin kullanıcılar CMS'e zaten tam yetkiyle erişir.",
    gecersiz: "Geçerli bir kullanıcı e-postası girin.",
  };

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Sistem</span>
          <h1>İçerik Yetkileri</h1>
          <p>Ürün rollerini değiştirmeden CMS erişimi ve yayınlama yetkisi verin.</p>
        </div>
      </div>

      {params.durum && messages[params.durum] ? <p className="content-status-success">{messages[params.durum]}</p> : null}

      <div className="content-panel">
        <h2>İçerik yöneticisi ekle veya güncelle</h2>
        <form className="content-form" action="/api/cms-access-manage" method="post">
          <input type="hidden" name="action" value="save" />
          <label><span>Kullanıcı e-postası</span><input type="email" name="email" required maxLength={320} placeholder="kullanici@ilkoku.com" /></label>
          <label><input type="checkbox" name="canPublish" /> <span>Yayınlama yetkisi ver</span></label>
          <div className="content-form-actions"><button type="submit">Yetkiyi kaydet</button></div>
        </form>
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <h2>Yetkilendirilmiş kullanıcılar</h2>
        {rows.length === 0 ? (
          <div className="content-empty-state"><strong>Henüz içerik yöneticisi yok.</strong></div>
        ) : (
          <div className="content-table-wrap">
            <table className="content-table">
              <thead><tr><th>Kullanıcı</th><th>Ürün rolü</th><th>CMS</th><th>Yayın</th><th>Yetki tarihi</th><th>İşlem</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.email}>
                    <td><strong>{row.displayName || row.fullName}</strong><br /><small>{row.email}</small></td>
                    <td>{row.role}</td>
                    <td>{row.active ? "Aktif" : "İptal"}</td>
                    <td>{row.active && row.canPublish ? "Yetkili" : "Yok"}</td>
                    <td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(row.grantedAt))}</td>
                    <td>
                      {row.active ? (
                        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                          <form action="/api/cms-access-manage" method="post">
                            <input type="hidden" name="action" value="save" />
                            <input type="hidden" name="email" value={row.email} />
                            <label><input type="checkbox" name="canPublish" defaultChecked={row.canPublish} /> <span>Yayın</span></label>
                            <button type="submit">Güncelle</button>
                          </form>
                          <form action="/api/cms-access-manage" method="post">
                            <input type="hidden" name="action" value="revoke" />
                            <input type="hidden" name="email" value={row.email} />
                            <button type="submit">Erişimi iptal et</button>
                          </form>
                        </div>
                      ) : (
                        <form action="/api/cms-access-manage" method="post">
                          <input type="hidden" name="action" value="save" />
                          <input type="hidden" name="email" value={row.email} />
                          <button type="submit">Yeniden etkinleştir</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
