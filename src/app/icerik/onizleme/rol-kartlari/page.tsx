import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { normalizeCmsLocale } from "@/lib/cms-locales";
import { getRoleCardsWorkbenchState } from "@/lib/cms-role-card-store";
import { cmsRoleMeta, roleCardsDefaults, roleCardsFromPayload } from "@/lib/cms-role-cards";

export const dynamic = "force-dynamic";

export default async function RoleCardsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ dil?: string }>;
}) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  await requireCmsManager("/icerik/onizleme/rol-kartlari");
  const state = await getRoleCardsWorkbenchState(locale);
  const unavailable = state.live.state === "unavailable" || state.draft.state === "unavailable";
  const corrupt = state.live.state === "corrupt" || state.draft.state === "corrupt";

  if (unavailable || corrupt) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Önizleme · {locale.toUpperCase()}</span><h1>Rol Kartları</h1><p>Güvenilir taslak verisi olmadan önizleme üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>{corrupt ? "Rol kartı verisi bozuk." : "Rol kartı verisi okunamadı."}</strong><p>Yanlış bir önizleme üretmemek için görünüm durduruldu.</p><Link href={`/icerik/rol-kartlari?dil=${locale}`}>Rol Kartları’na dön →</Link></div>
      </section>
    );
  }

  const draftPayload = state.draft.state === "valid" ? state.draft.record.payload : null;
  const livePayload = state.live.state === "valid" ? state.live.payload : null;
  const cards = draftPayload
    ? roleCardsFromPayload(locale, draftPayload)
    : livePayload
      ? roleCardsFromPayload(locale, livePayload)
      : roleCardsDefaults(locale);
  const visibleCards = cards.filter((card) => card.visible);
  const source = draftPayload ? "Çalışma taslağı" : livePayload ? "Canlı sürüm" : "Kod fallback’i";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Önizleme · {locale.toUpperCase()}</span><h1>Rol Kartları</h1><p>Public ana sayfaya aktarılacak kart sırası, metinleri ve görünürlüğü.</p></div>
        <div className="content-profile"><strong>{source}</strong><small>{visibleCards.length}/4 kart public görünür</small></div>
      </div>
      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href={`/icerik/rol-kartlari?dil=${locale}`}>← Düzenlemeye dön</Link>
        <Link href={locale === "en" ? "/en" : "/"}>Canlı site ↗</Link>
      </div>

      <div className="content-panel">
        <div className="content-section-heading"><div><span>01</span><h2>Public kart sırası</h2></div><p>{visibleCards.length} görünür kart</p></div>
        {visibleCards.length === 0 ? (
          <div className="content-empty"><strong>Public rol kartı görünmeyecek.</strong><p>Rol seçim başlığı kalır ancak kart alanı boş olur. Yayınlamadan önce en az bir kartı görünür yapmanız önerilir.</p></div>
        ) : (
          <div className="content-grid">
            {visibleCards.map((card) => (
              <article className="content-card" key={card.key}>
                <span style={{ fontSize: ".75rem", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{String(card.position).padStart(2, "0")} · {card.key}</span>
                <h2>{card.title}</h2>
                <p>{card.description}</p>
                <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: ".8rem" }}><small>{card.highlight1}</small><small>{card.highlight2}</small></div>
                <strong>{card.ctaLabel} →</strong>
                <small style={{ display: "block", marginTop: ".4rem" }}>{cmsRoleMeta[card.key].fixedHref}</small>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading"><div><span>02</span><h2>Gizlenen kartlar</h2></div><p>Public görünümden çıkarılacak</p></div>
        {cards.every((card) => card.visible) ? <div className="content-empty"><strong>Gizlenen kart yok.</strong></div> : (
          <div className="content-list">{cards.filter((card) => !card.visible).map((card) => <div className="content-list-row" key={card.key}><strong>{card.title}</strong><span>{card.key}</span><span>Sıra {card.position}</span><small>Public gizli</small></div>)}</div>
        )}
      </div>
    </section>
  );
}
