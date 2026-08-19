import Link from "next/link";
import { requireCmsAdmin } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import styles from "../SystemControlWorkbench.module.css";

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

type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

function param(params: SearchParams, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function accessHref(params: SearchParams, patch: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const key of ["q", "filtre", "sec", "yeni"] as const) {
    const value = param(params, key);
    if (value) query.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  const suffix = query.toString();
  return suffix ? `/icerik/erisim?${suffix}` : "/icerik/erisim";
}

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

function productRoleLabel(role: string) {
  const labels: Record<string, string> = {
    reader: "Okuyucu",
    writer: "Yazar",
    editor: "Editör",
    publisher: "Yayınevi",
    admin: "Admin",
  };
  return labels[role] || role;
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireCmsAdmin("/icerik/erisim");
  const params = await searchParams;

  let rows: AccessRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<AccessRow[]>`
      SELECT u.email, u.fullName, u.displayName, u.role,
             a.active, a.canPublish, a.grantedAt, a.revokedAt
      FROM ContentManagerAccess a
      INNER JOIN User u ON u.id = a.userId
      ORDER BY a.active DESC, a.canPublish DESC, a.updatedAt DESC
      LIMIT 200
    `;
  } catch {
    rows = null;
  }

  const messages: Record<string, string> = {
    kaydedildi: "CMS erişim profili kaydedildi.",
    iptal: "CMS erişimi iptal edildi.",
    "kullanici-yok": "Bu e-posta ile aktif ve kullanılabilir bir kullanıcı bulunamadı.",
    admin: "Admin kullanıcılar CMS'e zaten tam yetkiyle erişir; ayrıca kayıt oluşturulmaz.",
    gecersiz: "Geçerli bir kullanıcı e-postası girin.",
  };

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Sistem</span><h1>İçerik Yetkileri</h1><p>Yetki envanteri okunmadan erişim değişikliği yapılmaz.</p></div></div>
        <div className="content-panel" role="alert"><strong>CMS erişim kayıtları okunamadı.</strong><p>Bu durum “henüz içerik yöneticisi yok” anlamına gelmez. Mevcut yetki seti görülmeden ekleme, güncelleme veya iptal işlemleri durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/erisim">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const q = param(params, "q").trim().toLocaleLowerCase("tr-TR");
  const filter = param(params, "filtre") || "active";
  const requested = param(params, "sec");
  const showNew = param(params, "yeni") === "1";
  const filtered = rows.filter((row) => {
    if (filter === "active" && !row.active) return false;
    if (filter === "revoked" && row.active) return false;
    if (filter === "publish" && !(row.active && row.canPublish)) return false;
    if (filter === "manage" && !(row.active && !row.canPublish)) return false;
    if (q && !`${row.displayName || ""} ${row.fullName} ${row.email} ${row.role}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
    return true;
  });
  const selected = rows.find((row) => row.email === requested) ?? filtered[0] ?? rows[0] ?? null;

  const activeCount = rows.filter((row) => row.active).length;
  const publishCount = rows.filter((row) => row.active && row.canPublish).length;
  const manageOnlyCount = rows.filter((row) => row.active && !row.canPublish).length;
  const revokedCount = rows.filter((row) => !row.active).length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Sistem · Admin</span><h1>İçerik Yetkileri</h1><p>Ürün rollerini değiştirmeden CMS erişimini kişi bazında yönetin. Yönetim ve yayınlama iki ayrı yetki seviyesidir.</p></div>
        <div className="content-profile"><strong>{activeCount} aktif CMS kullanıcısı</strong><small>{publishCount} yayın yetkili · {manageOnlyCount} yalnız yönetim</small></div>
      </div>

      {params.durum && messages[param(params, "durum")] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>{messages[param(params, "durum")]}</strong></div> : null}

      <div className={styles.workbench}>
        <div className={styles.summaryBar}>
          <article className={styles.summaryCard}><span>Aktif erişim</span><strong>{activeCount}</strong><small>CMS'e girebilir</small></article>
          <article className={styles.summaryCard}><span>Yayın yetkili</span><strong>{publishCount}</strong><small>canlı yayın yapabilir</small></article>
          <article className={styles.summaryCard}><span>Yalnız yönetim</span><strong>{manageOnlyCount}</strong><small>taslak hazırlayabilir</small></article>
          <article className={styles.summaryCard}><span>İptal edilmiş</span><strong>{revokedCount}</strong><small>erişimi kapalı</small></article>
        </div>

        <div className={styles.layout}>
          <aside className={styles.rail}>
            <div className={styles.railHeader}><span className={styles.kicker}>CMS kullanıcıları</span><Link href={accessHref(params, { yeni: "1", sec: undefined })}>+ Yeni yetki</Link></div>
            <form method="get" className={styles.searchForm}>
              <input type="search" name="q" defaultValue={param(params, "q")} placeholder="Ad, e-posta veya rol ara" />
              {filter !== "active" ? <input type="hidden" name="filtre" value={filter} /> : null}
              <button type="submit">Ara</button>
            </form>
            <div className={styles.filters}>
              <span className={styles.label}>Erişim görünümü</span>
              <div className={styles.filterRow}>
                {[{ key: "active", label: "Aktif" }, { key: "publish", label: "Yayın" }, { key: "manage", label: "Yönetim" }, { key: "revoked", label: "İptal" }, { key: "all", label: "Tümü" }].map((item) => (
                  <Link key={item.key} data-active={filter === item.key} href={accessHref(params, { filtre: item.key, sec: undefined, yeni: undefined })}>{item.label}</Link>
                ))}
              </div>
            </div>
            {filtered.length === 0 ? <div className={styles.empty}><strong>Bu filtrede kullanıcı yok.</strong><span>Filtreyi değiştirin veya yeni CMS erişimi ekleyin.</span></div> : (
              <div className={styles.itemList}>
                {filtered.map((row) => (
                  <Link key={row.email} href={accessHref(params, { sec: row.email, yeni: undefined })} className={styles.itemLink} data-active={!showNew && selected?.email === row.email}>
                    <div className={styles.itemTop}><strong>{row.displayName || row.fullName}</strong><span className={styles.badge} data-tone={!row.active ? "danger" : row.canPublish ? "success" : "warning"}>{!row.active ? "İptal" : row.canPublish ? "Yayın" : "Yönetim"}</span></div>
                    <p>{row.email}</p><small>{productRoleLabel(row.role)} · {row.active ? "CMS aktif" : "CMS kapalı"}</small>
                  </Link>
                ))}
              </div>
            )}
          </aside>

          <main className={styles.detail}>
            {showNew ? (
              <>
                <div className={styles.detailHeader}><span className={styles.kicker}>Yeni erişim</span><h2>CMS kullanıcısı ekle</h2><p>Önce kayıtlı kullanıcıyı e-posta adresiyle seçin; ürün rolü değişmez.</p></div>
                <div className={styles.detailBody}>
                  <div className={styles.infoCard}><strong>Yetki modeli</strong><p>“Yönetim” taslak hazırlama ve CMS çalışma alanlarını kullanma hakkıdır. “Yönetim + Yayın” buna ek olarak canlı yayınlama yetkisi verir.</p></div>
                  <form className={styles.newAccess} action="/api/cms-access-manage" method="post">
                    <input type="hidden" name="action" value="save" />
                    <label><span className={styles.label}>Kullanıcı e-postası</span><input type="email" name="email" required maxLength={320} placeholder="kullanici@ilkoku.com" /></label>
                    <div className={styles.permissionGrid}>
                      <article className={styles.permissionCard}><span className={styles.badge} data-tone="warning">Yönetim</span><strong>Taslak ve içerik yönetimi</strong><p>Canlı yayın kararı veremez.</p><button type="submit">Yönetim yetkisi ver</button></article>
                      <article className={styles.permissionCard}><span className={styles.badge} data-tone="success">Yönetim + Yayın</span><strong>Canlı yayın yetkisi</strong><p>İçerik yönetimine ek olarak yayınlayabilir.</p><button type="submit" name="canPublish" value="on">Yayın yetkisiyle ekle</button></article>
                    </div>
                  </form>
                </div>
              </>
            ) : !selected ? <div className={styles.empty}><strong>CMS erişim kaydı yok.</strong><span>Yeni yetki ekleyerek başlayın.</span></div> : (
              <>
                <div className={styles.detailHeader}>
                  <div className={styles.itemTop}><span className={styles.badge} data-tone={!selected.active ? "danger" : selected.canPublish ? "success" : "warning"}>{!selected.active ? "Erişim iptal" : selected.canPublish ? "Yayın yetkili" : "Yalnız yönetim"}</span><span className={styles.badge}>{productRoleLabel(selected.role)}</span></div>
                  <div><span className={styles.kicker}>Seçili kullanıcı</span><h2>{selected.displayName || selected.fullName}</h2><p>{selected.email}</p></div>
                  <div className={styles.metaGrid}>
                    <div className={styles.metaCard}><span className={styles.label}>Ürün rolü</span><strong>{productRoleLabel(selected.role)}</strong><small>CMS bu rolü değiştirmez</small></div>
                    <div className={styles.metaCard}><span className={styles.label}>CMS erişimi</span><strong>{selected.active ? "Aktif" : "Kapalı"}</strong><small>{selected.active ? "çalışma alanına girebilir" : "erişim reddedilir"}</small></div>
                    <div className={styles.metaCard}><span className={styles.label}>Yayınlama</span><strong>{selected.active && selected.canPublish ? "Yetkili" : "Yok"}</strong><small>canlı yayın sınırı</small></div>
                  </div>
                </div>
                <div className={styles.detailBody}>
                  <div className={styles.profileCard}><span className={styles.label}>Yetki geçmişi</span><strong>Son yetkilendirme: {formatDate(selected.grantedAt)}</strong><p>{selected.revokedAt ? `Son iptal: ${formatDate(selected.revokedAt)}` : "Aktif kayıtta iptal tarihi yok."}</p></div>
                  <div className={styles.permissionGrid}>
                    <article className={styles.permissionCard} data-active={selected.active && !selected.canPublish}><span className={styles.badge} data-tone="warning">Yönetim</span><strong>Taslak hazırlama profili</strong><p>İçerik üretir ve düzenler; canlı yayın yetkisi yoktur.</p><form action="/api/cms-access-manage" method="post"><input type="hidden" name="action" value="save" /><input type="hidden" name="email" value={selected.email} /><button type="submit" disabled={selected.active && !selected.canPublish}>Yalnız yönetim yap</button></form></article>
                    <article className={styles.permissionCard} data-active={selected.active && selected.canPublish}><span className={styles.badge} data-tone="success">Yönetim + Yayın</span><strong>Yayıncı profili</strong><p>Taslak yönetimine ek olarak canlı yayın kararı verebilir.</p><form action="/api/cms-access-manage" method="post"><input type="hidden" name="action" value="save" /><input type="hidden" name="email" value={selected.email} /><button type="submit" name="canPublish" value="on" disabled={selected.active && selected.canPublish}>Yayın yetkisi ver</button></form></article>
                  </div>
                </div>
              </>
            )}
          </main>

          <aside className={styles.sidePane}>
            <div className={styles.sideHeader}><span className={styles.kicker}>Etki & güvenlik</span><strong>{showNew ? "Yeni erişim" : selected ? "Seçili profil" : "—"}</strong></div>
            <div className={styles.sideBody}>
              <div className={styles.impactCard}><strong>Ürün rolü değişmez</strong><p>Buradaki işlemler Okuyucu, Yazar, Editör veya Yayınevi rolünü değiştirmez. Sadece `/icerik` çalışma alanı yetkisini yönetir.</p></div>
              <div className={styles.impactCard}><strong>Yayın yetkisi ayrıdır</strong><p>İçerik yönetebilmek otomatik olarak canlı yayınlama hakkı vermez.</p></div>
              {!showNew && selected?.active ? <div className={styles.dangerCard}><span className={styles.label}>Erişim iptali</span><strong>CMS erişimini tamamen kapat</strong><p>Yönetim ve yayın yetkileri birlikte kaldırılır. Ürün hesabı silinmez.</p><form action="/api/cms-access-manage" method="post"><input type="hidden" name="action" value="revoke" /><input type="hidden" name="email" value={selected.email} /><button type="submit">CMS erişimini iptal et</button></form></div> : null}
              {!showNew && selected && !selected.active ? <div className={styles.infoCard}><strong>Yeniden etkinleştirme</strong><p>Profil yeniden etkinleştirilirken varsayılan olarak yalnız yönetim yetkisi verilir. Yayın yetkisini ayrıca seçebilirsiniz.</p></div> : null}
              <div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/ayarlar">İçerik Ayarları</Link><Link href="/icerik/saglik">Sistem Sağlığı</Link></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
