import Link from "next/link";
import { RoleCardsWorkbench } from "@/components/content/RoleCardsWorkbench";
import { requireCmsManager } from "@/lib/cms-access";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { normalizeCmsLocale } from "@/lib/cms-locales";
import { getRoleCardsWorkbenchState } from "@/lib/cms-role-card-store";
import { roleCardsDefaults, roleCardsFromPayload } from "@/lib/cms-role-cards";

export const dynamic = "force-dynamic";

function stateLabel(hasDraft: boolean, liveState: string) {
  if (hasDraft && liveState === "valid") return "Çalışma taslağı hazır · canlı sürüm korunuyor";
  if (hasDraft) return "Çalışma taslağı hazır · ilk yayın bekleniyor";
  if (liveState === "valid") return "Yayındaki içerikten çalışıyorsun";
  return "Henüz CMS yayını yok · güvenli varsayılan içerik gösteriliyor";
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
            <p>Rol kartı verisi güvenilir biçimde okunamadığında çalışma kopyasının üzerine yazılmaz.</p>
          </div>
        </div>
        <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
          <Link href="/icerik/rol-kartlari?dil=tr">Türkçe</Link>
          <Link href="/icerik/rol-kartlari?dil=en">English</Link>
        </div>
        <div className="content-panel" role="alert">
          <strong>{dataCorrupt ? "Rol kartı verilerinden en az biri bozuk." : "Rol kartı verileri okunamadı."}</strong>
          <p>Yanlış varsayılanların canlı veya taslak içeriğin üzerine yazılmaması için kaydetme ve yayınlama durduruldu.</p>
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
  const initialCards = draftPayload
    ? roleCardsFromPayload(locale, draftPayload)
    : livePayload
      ? roleCardsFromPayload(locale, livePayload)
      : roleCardsDefaults(locale);

  const errorCode = typeof params.hata === "string" ? params.hata : "";
  const errorMessages: Record<string, string> = {
    alan: "Dört kartta da başlık, açıklama, buton metni ve iki öne çıkan özellik dolu olmalıdır.",
    sira: "Kart sıralaması doğrulanamadı. Çalışma masasında yukarı/aşağı taşıma ile yeniden sıralayın.",
    "taslak-bozuk": "Mevcut çalışma taslağı bozuk. Güvenli onarım yapılmadan üzerine yazılmadı.",
    "taslak-yok": "Yayınlanacak çalışma taslağı bulunamadı.",
    "dil-pasif": `${locale.toUpperCase()} public dili kapalı olduğu için yayınlama engellendi.`,
  };

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Site · Ana Sayfa · {locale.toUpperCase()}</span>
          <h1>Rol Kartları</h1>
          <p>Yazar, Okuyucu, Editör ve Yayınevi kartlarını tek tek düzenle; görünürlüğü ve sıralamayı görsel çalışma masasında yönet.</p>
        </div>
        <div className="content-profile">
          <strong>{stateLabel(hasDraft, state.live.state)}</strong>
          <small>Rol kimliği ve kayıt hedefleri sistemde kilitli kalır.</small>
        </div>
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/rol-kartlari?dil=tr" aria-current={locale === "tr" ? "page" : undefined}>Türkçe</Link>
        <Link href="/icerik/rol-kartlari?dil=en" aria-current={locale === "en" ? "page" : undefined}>English</Link>
        <Link href="/icerik/ana-sayfa">Ana Sayfa İçeriği</Link>
        <Link href="/icerik/yayin-kuyrugu">Yayın Kuyruğu</Link>
        {locale === "en" ? <Link href="/icerik/diller">Dil Yönetimi</Link> : null}
      </div>

      {errorCode && errorMessages[errorCode] ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert">
          <strong>İşlem tamamlanamadı.</strong>
          <p>{errorMessages[errorCode]}</p>
        </div>
      ) : null}

      {params.kayit === "1" ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Çalışma taslağı kaydedildi.</strong>
          <p>Canlı site değişmedi. İstersen tam sayfa önizlemeyi açabilir veya yayın yetkin varsa aşağıdan canlıya alabilirsin.</p>
        </div>
      ) : null}

      {params.yayin === "1" ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Rol kartları canlıya yayınlandı.</strong>
          <p>Dört kart tek set olarak güncellendi ve çalışma taslağı temizlendi.</p>
        </div>
      ) : null}

      {!access.canPublish ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>Bu hesap taslak hazırlayabilir.</strong>
          <p>Canlı yayın için ayrıca yayın yetkisi gerekir. Düzenleme ve önizleme işlevleri açık kalır.</p>
        </div>
      ) : null}

      {locale === "en" && !localeEnabled ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>EN public yayın kapalı.</strong>
          <p>İngilizce kartları hazırlayıp kaydedebilirsin; Dil Yönetimi’nden EN açılmadan canlıya yayınlanamaz.</p>
        </div>
      ) : null}

      <RoleCardsWorkbench
        locale={locale}
        initialCards={initialCards}
        hasDraft={hasDraft}
        canPublish={access.canPublish}
        localeEnabled={localeEnabled}
        liveAvailable={state.live.state === "valid"}
      />
    </section>
  );
}
