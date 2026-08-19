import Link from "next/link";
import { requireCmsAdmin } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import ops from "../PublishingOperationsWorkbench.module.css";
import policy from "../PolicyOperationsWorkbench.module.css";

type AccessRow = {
  userId: string;
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
function formatDate(value?: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}
function accessHref(params: SearchParams, patch: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const key of ["q", "durum", "sec"] as const) {
    const current = param(params, key);
    if (current) query.set(key, current);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  const suffix = query.toString();
  return suffix ? `/icerik/erisim?${suffix}` : "/icerik/erisim";
}
function permissionLabel(row: AccessRow) {
  if (!row.active) return "Erişim iptal";
  return row.canPublish ? "Yönet + Yayınla" : "Yalnız Yönet";
}
function permissionTone(row: AccessRow) {
  if (!row.active) return "initial";
  return row.canPublish ? "published" : "working";
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireCmsAdmin("/icerik/erisim");
  const params = await searchParams;

  let rows: AccessRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<AccessRow[]>`
      SELECT u.id AS userId, u.email, u.fullName, u.displayName, u.role,
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
    kaydedildi: "İçerik yöneticisi yetkisi kaydedildi.",
    iptal: "İçerik yöneticisi erişimi iptal edildi.",
    "kullanici-yok": "Bu e-posta ile kayıtlı aktif kullanıcı bulunamadı.",
    admin: "Admin kullanıcılar CMS'e zaten tam yetkiyle erişir.",
    gecersiz: "Geçerli bir kullanıcı e-postası girin.",
  };

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Sistem</span><h1>İçerik Yetkileri</h1><p>Yetki listesi doğrulanamadığında erişim değişikliği yapılmaz.</p></div></div>
        <div className="content-panel" role="alert"><strong>CMS erişim kayıtları okunamadı.</strong><p>Bu durum “henüz içerik yöneticisi yok” anlamına gelmez. Mevcut yetki seti görülmeden ekleme, güncelleme veya iptal işlemleri durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/erisim">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const q = param(params, "q").trim().toLocaleLowerCase("tr-TR");
  const stateFilter = param(params, "durum") || "all";
  const selectedId = param(params, "sec");
  const filtered = rows.filter((row) => {
    if (q && !`${row.displayName || ""} ${row.fullName} ${row.email} ${row.role}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
    if (stateFilter === "active" && !row.active) return false;
    if (stateFilter === "publish" && (!row.active || !row.canPublish)) return false;
    if (stateFilter === "manage" && (!row.active || row.canPublish)) return false;
    if (stateFilter === "revoked" && row.active) return false;
    return true;
  });
  const selected = filtered.find((row) => row.userId === selectedId) ?? filtered[0] ?? null;

  const activeCount = rows.filter((row) => row.active).length;
  const publisherCount = rows.filter((row) => row.active && row.canPublish).length;
  const managerOnlyCount = rows.filter((row) => row.active && !row.canPublish).length;
  const revokedCount = rows.filter((row) => !row.active).length;
  const statusMessage = param(params, "durum");

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Sistem</span><h1>İçerik Yetkileri</h1><p>Ürün rolünü değiştirmeden CMS erişimini ayrı yönetin; kullanıcıyı seçin, mevcut seviyeyi görün ve yayın yetkisinin etkisini açıkça kontrol edin.</p></div>
        <div className="content-profile"><strong>{activeCount} aktif CMS kullanıcısı</strong><small>{publisherCount} yayın yetkili · {managerOnlyCount} yalnız yönetim</small></div>
      </div>
      {statusMessage && messages[statusMessage] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>{messages[statusMessage]}</strong></div> : null}

      <div className={ops.workbench}>
        <div className={ops.summaryBar}>
          <article className={ops.summaryCard}><span>Aktif erişim</span><strong>{activeCount}</strong><small>CMS’e girebilir</small></article>
          <article className={ops.summaryCard}><span>Yayın yetkili</span><strong>{publisherCount}</strong><small>canPublish = true</small></article>
          <article className={ops.summaryCard}><span>Yalnız yönetim</span><strong>{managerOnlyCount}</strong><small>taslak/operasyon yönetimi</small></article>
          <article className={ops.summaryCard}><span>İptal edilmiş</span><strong>{revokedCount}</strong><small>erişim kapalı</small></article>
        </div>

        <div className={ops.layout}>
          <aside className={ops.rail}>
            <div className={ops.railHeader}><span className={ops.railLabel}>CMS kullanıcıları</span><strong>{filtered.length} kayıt gösteriliyor</strong></div>
            <form method="get" className={ops.searchForm}><input type="search" name="q" defaultValue={param(params, "q")} placeholder="Ad, e-posta veya ürün rolü ara" />{stateFilter !== "all" ? <input type="hidden" name="durum" value={stateFilter} /> : null}<button type="submit">Ara</button></form>
            <div className={ops.filters}><span className={ops.railLabel}>Yetki seviyesi</span><div className={ops.filterRow}>{[{ key: "all", label: "Tümü" }, { key: "active", label: "Aktif" }, { key: "publish", label: "Yayın" }, { key: "manage", label: "Yalnız yönet" }, { key: "revoked", label: "İptal" }].map((filter) => <Link key={filter.key} data-active={stateFilter === filter.key} href={accessHref(params, { durum: filter.key === "all" ? undefined : filter.key, sec: undefined })}>{filter.label}</Link>)}</div></div>
            {filtered.length === 0 ? <div className={ops.empty}>Bu filtrelerde yetkilendirilmiş kullanıcı yok.</div> : <div className={ops.itemList}>{filtered.map((row) => <Link key={row.userId} href={accessHref(params, { sec: row.userId })} className={ops.itemLink} data-active={selected?.userId === row.userId}>
              <div className={ops.itemTop}><strong>{row.displayName || row.fullName}</strong><span className={ops.badge} data-tone={permissionTone(row)}>{permissionLabel(row)}</span></div>
              <p>{row.email}</p>
              <div className={ops.itemMeta}><span>Ürün rolü: {row.role}</span><span>{row.active ? `Yetki: ${formatDate(row.grantedAt)}` : `İptal: ${formatDate(row.revokedAt)}`}</span></div>
            </Link>)}</div>}
          </aside>

          <main className={ops.detail}>
            {!selected ? <div className={ops.empty}><strong>İncelenecek CMS kullanıcısı yok.</strong><p>Sağ panelden yeni bir kullanıcı yetkilendirebilirsiniz.</p></div> : <>
              <div className={ops.detailHeader}>
                <div className={ops.detailTopline}><span className={ops.badge} data-tone={permissionTone(selected)}>{permissionLabel(selected)}</span><span className={ops.badge}>Ürün rolü: {selected.role}</span></div>
                <div><span className={ops.eyebrow}>Seçili kullanıcı</span><h2>{selected.displayName || selected.fullName}</h2><p>{selected.email}</p></div>
                <div className={ops.detailMetaGrid}>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>CMS</span><strong>{selected.active ? "Aktif" : "İptal"}</strong><small>ContentManagerAccess</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Yayın</span><strong>{selected.active && selected.canPublish ? "Yetkili" : "Yok"}</strong><small>canonical publish sınırı</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Ürün rolü</span><strong>{selected.role}</strong><small>bu ekrandan değişmez</small></div>
                </div>
              </div>
              <div className={ops.detailBody}>
                <div className={policy.capabilityGrid}>
                  <div className={policy.capability}><span>İçerik paneline giriş</span><strong>{selected.active ? "Evet" : "Hayır"}</strong><small>CMS manager boundary</small></div>
                  <div className={policy.capability}><span>Taslak / operasyon yönetimi</span><strong>{selected.active ? "Evet" : "Hayır"}</strong><small>manager yetkisi</small></div>
                  <div className={policy.capability}><span>Canlı yayınlama</span><strong>{selected.active && selected.canPublish ? "Evet" : "Hayır"}</strong><small>publisher yetkisi</small></div>
                  <div className={policy.capability}><span>Admin-only ayarlar</span><strong>Hayır</strong><small>ürün admin rolü gerektirir</small></div>
                </div>
                <div className={ops.infoBox}><strong>Rol sınırı korunuyor.</strong><p>Bu yetkilendirme kullanıcının Okur/Yazar/Editör/Yayınevi ürün rolünü değiştirmez; yalnız `/icerik` erişim katmanını yönetir.</p></div>
              </div>
            </>}
          </main>

          <aside className={ops.sidePane}>
            <div className={ops.sideHeader}><span className={ops.railLabel}>Yetki kararı</span><strong>{selected ? permissionLabel(selected) : "Yeni kullanıcı"}</strong></div>
            <div className={ops.sideBody}>
              {selected ? <>
                <div className={policy.permissionLevel}>
                  <div className={policy.permissionStep} data-enabled={selected.active}><span>{selected.active ? "✓" : "1"}</span><div><strong>CMS erişimi</strong><small>İçerik çalışma masalarına giriş ve taslak yönetimi.</small></div></div>
                  <div className={policy.permissionStep} data-enabled={selected.active && selected.canPublish}><span>{selected.active && selected.canPublish ? "✓" : "2"}</span><div><strong>Yayın yetkisi</strong><small>Canlı içerik değiştiren canonical publish/restore/schedule aksiyonları.</small></div></div>
                  <div className={policy.permissionStep} data-enabled={false}><span>3</span><div><strong>Admin-only sistem ayarları</strong><small>Bu grant ile verilmez; ürün admin rolü gerekir.</small></div></div>
                </div>
                {selected.active ? <form action="/api/cms-access-manage" method="post" className={policy.permissionForm}>
                  <input type="hidden" name="action" value="save" /><input type="hidden" name="email" value={selected.email} />
                  <label><input type="checkbox" name="canPublish" defaultChecked={selected.canPublish} /><span><strong>Canlı yayınlama yetkisi</strong><small>Açılırsa kullanıcı requireCmsPublisher ile korunan aksiyonları çalıştırabilir.</small></span></label>
                  <button type="submit">Yetki Seviyesini Güncelle</button>
                </form> : <form action="/api/cms-access-manage" method="post" className={policy.permissionForm}><input type="hidden" name="action" value="save" /><input type="hidden" name="email" value={selected.email} /><label><input type="checkbox" name="canPublish" /><span><strong>Yayın yetkisiyle yeniden etkinleştir</strong><small>İşaretlenmezse yalnız CMS yönetim erişimi açılır.</small></span></label><button type="submit">Erişimi Yeniden Etkinleştir</button></form>}
                {selected.active ? <form action="/api/cms-access-manage" method="post"><input type="hidden" name="action" value="revoke" /><input type="hidden" name="email" value={selected.email} /><button type="submit">CMS Erişimini İptal Et</button></form> : null}
                {selected.active && selected.canPublish ? <div className={policy.riskNotice}>Yayın yetkisi canlı siteyi değiştirebilir. Bu yetki yalnız gerçekten yayın kararı verecek kişilere verilmelidir.</div> : null}
              </> : <div className={ops.empty}>Mevcut bir kullanıcı seçin veya aşağıdan yeni yetki verin.</div>}

              <div className={ops.infoBox}><strong>Yeni içerik yöneticisi</strong><p>Kayıtlı ve aktif kullanıcı e-postası gerekir. Admin kullanıcıya ayrıca CMS grant verilmez.</p></div>
              <form className={policy.addUser} action="/api/cms-access-manage" method="post"><input type="hidden" name="action" value="save" /><label><span>Kullanıcı e-postası</span><input type="email" name="email" required maxLength={320} placeholder="kullanici@ilkoku.com" /></label><label style={{ display: "flex", gap: ".5rem", alignItems: "flex-start" }}><input type="checkbox" name="canPublish" /><span>Yayınlama yetkisi de ver</span></label><button type="submit">CMS Yetkisi Ver</button></form>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
