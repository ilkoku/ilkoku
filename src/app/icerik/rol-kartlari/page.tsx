import Link from "next/link";
import { publishRoleCardsAction, saveRoleCardsAction } from "@/features/cms/role-card-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { normalizeCmsLocale } from "@/lib/cms-locales";
import { getRoleCardsWorkbenchState } from "@/lib/cms-role-card-store";
import { cmsRoleKeys, cmsRoleMeta, roleCardsDefaults, roleCardsFromPayload } from "@/lib/cms-role-cards";

export const dynamic = "force-dynamic";

function stateLabel(hasDraft: boolean, liveState: string) {
  if (hasDraft && liveState === "valid") return "Taslak hazır · canlı sürüm korunuyor";
  if (hasDraft) return "Taslak hazır · henüz canlı sürüm yok";
  if (liveState === "valid") return "Yayında · bekleyen taslak yok";
  return "Henüz CMS yayını yok · kod fallback’i aktif";
}

export default async function RoleCardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(typeof params.dil === "string" ? params.dil : undefined);
  const access = await requireCmsManager("/icerik/rol-kartlari");
  const [localeEnabled, state] = await Promise.all([
    isCmsLocaleEnabled(locale).catch(() => false),
    getRoleCardsWorkbenchState(locale),
  ]);

  const dataUnavailable = state.live.state === "unavailable" || state.draft.state === "unavailable";
  const dataCorrupt = state.live.state === "corrupt" || state.draft.state === "corrupt";

  if (dataUnavailable || dataCorrupt) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading">
          <div>
            <span>Site · {locale.toUpperCase()}</span>
            <h1>Rol Kartları</h1>
            <p>Yazar, Okuyucu, Editör ve Yayınevi giriş kartları tek ve atomik bir içerik seti olarak yönetilir.</p>
          </div>
        </div>
        <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
          <Link href="/icerik/rol-kartlari?dil=tr">Türkçe</Link>
          <Link href="/icerik/rol-kartlari?dil=en">English</Link>
        </div>
        <div className="content-panel" role="alert">
          <strong>{dataCorrupt ? "Rol kartı verilerinden en az biri bozuk." : "Rol kartı verileri güvenilir biçimde okunamadı."}</strong>
          <p>Yanlış varsayılanların canlı içerik üzerine yazılmaması için kaydetme ve yayınlama aksiyonları durduruldu.</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
            <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
            <Link href={`/icerik/rol-kartlari?dil=${locale}`}>Tekrar dene ↻</Link>
          </div>
        </div>
      </section>
    );
  }

  const hasDraft = state.draft.state === "valid";
  const livePayload = state.live.state === "valid" ? state.live.payload : null;
  const draftPayload = state.draft.state === "valid" ? state.draft.record.payload : null;
  const cards = draftPayload
    ? roleCardsFromPayload(locale, draftPayload)
    : livePayload
      ? roleCardsFromPayload(locale, livePayload)
      : roleCardsDefaults(locale);
  const cardsByKey = new Map(cards.map((card) => [card.key, card]));
  const visibleCount = cards.filter((card) => card.visible).length;
  const errorCode = typeof params.hata === "string" ? params.hata : "";
  const errorMessages: Record<string, string> = {
    alan: "Dört rol kartında da başlık, açıklama, CTA ve iki özellik alanı zorunludur.",
    sira: "Kart sıraları 1–4 arasında ve birbirinden farklı olmalıdır.",
    "taslak-bozuk": "Mevcut çalışma taslağı bozuk. Güvenli onarım yapılmadan üzerine yazılmadı.",
    "taslak-yok": "Yayınlanacak çalışma taslağı bulunamadı.",
    "dil-pasif": `${locale.toUpperCase()} public dili kapalı olduğu için yayınlama engellendi.`,
  };

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Site · {locale.toUpperCase()}</span>
          <h1>Rol Kartları</h1>
          <p>Ana sayfadaki dört rol kartının metin, görünürlük ve sırasını yönetin. Rol kimliği, ikon ve kayıt hedefi sistem tarafından kilitlidir.</p>
        </div>
        <div className="content-profile">
          <strong>{visibleCount}/4 görünür</strong>
          <small>{stateLabel(hasDraft, state.live.state)}</small>
        </div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/rol-kartlari?dil=tr">Türkçe</Link>
        <Link href="/icerik/rol-kartlari?dil=en">English</Link>
        <Link href={`/icerik/onizleme/rol-kartlari?dil=${locale}`}>Taslağı Önizle ↗</Link>
        <Link href="/icerik/ana-sayfa">Ana Sayfa İçeriği</Link>
        {locale === "en" ? <Link href="/icerik/diller">Dil Yönetimi</Link> : null}
      </div>

      {errorCode && errorMessages[errorCode] ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert">
          <strong>İşlem tamamlanamadı.</strong>
          <p>{errorMessages[errorCode]}</p>
        </div>
      ) : null}
      {params.kayit === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Rol kartları çalışma taslağı kaydedildi.</strong></div> : null}
      {params.yayin === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Rol kartları canlıya yayınlandı.</strong></div> : null}
      {!access.canPublish ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Taslak yönetim yetkisi</strong><p>Bu hesap rol kartlarını hazırlayabilir ve önizleyebilir. Canlı yayınlama ayrıca yayın yetkisi gerektirir.</p></div> : null}
      {locale === "en" && !localeEnabled ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>EN public yayın kapalı.</strong><p>İngilizce rol kartları hazırlanabilir ve önizlenebilir; Dil Yönetimi’nden EN açılmadan canlıya yayınlanamaz.</p></div> : null}

      <form action={saveRoleCardsAction} className="content-form">
        <input type="hidden" name="locale" value={locale} />
        {cmsRoleKeys.map((role, index) => {
          const card = cardsByKey.get(role) ?? roleCardsDefaults(locale).find((item) => item.key === role)!;
          const meta = cmsRoleMeta[role];
          return (
            <div className="content-panel" key={role} style={{ margin: 0 }}>
              <div className="content-section-heading">
                <div><span>{String(index + 1).padStart(2, "0")}</span><h2>{card.title}</h2></div>
                <p>{role.toUpperCase()} · kimlik kilitli</p>
              </div>
              <div className="content-form-grid">
                <label><span>Kart başlığı</span><input name={`${role}Title`} required maxLength={80} defaultValue={card.title} /></label>
                <label><span>CTA metni</span><input name={`${role}CtaLabel`} required maxLength={80} defaultValue={card.ctaLabel} /></label>
              </div>
              <label><span>Açıklama</span><textarea name={`${role}Description`} required maxLength={700} rows={3} defaultValue={card.description} /></label>
              <div className="content-form-grid">
                <label><span>Özellik 1</span><input name={`${role}Highlight1`} required maxLength={120} defaultValue={card.highlight1} /></label>
                <label><span>Özellik 2</span><input name={`${role}Highlight2`} required maxLength={120} defaultValue={card.highlight2} /></label>
                <label><span>Sıra</span><select name={`${role}Position`} defaultValue={String(card.position)}>{[1, 2, 3, 4].map((position) => <option value={position} key={position}>{position}</option>)}</select></label>
                <label><span>Görünürlük</span><span style={{ display: "flex", alignItems: "center", gap: ".6rem", minHeight: "2.75rem" }}><input type="checkbox" name={`${role}Visible`} defaultChecked={card.visible} style={{ width: "auto" }} /> Public kartı göster</span></label>
              </div>
              <div className="content-panel" style={{ margin: ".5rem 0 0" }}>
                <strong>Sistem tarafından kilitli</strong>
                <p style={{ marginBottom: 0 }}>İkon: {meta.icon} · Kayıt hedefi: <code>{meta.fixedHref}</code>. İçerik yöneticisi rol kimliğini veya auth hedefini değiştiremez.</p>
              </div>
            </div>
          );
        })}
        <div className="content-form-actions" style={{ position: "sticky", bottom: "1rem", zIndex: 5 }}>
          <button type="submit">Çalışma Taslağını Kaydet</button>
        </div>
      </form>

      <div className="content-publish-box" style={{ marginTop: "1rem" }}>
        <div>
          <strong>Yayınlama · {stateLabel(hasDraft, state.live.state)}</strong>
          <p>Dört rol kartı tek set halinde yayınlanır. Canlı kartlar ancak açıkça yayınladığınızda değişir.</p>
        </div>
        {access.canPublish && localeEnabled && hasDraft ? (
          <form action={publishRoleCardsAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit">Rol Kartlarını Yayınla</button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
