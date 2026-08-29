import { demoShowcaseAccounts, getDemoShowcaseStatus } from "@/features/demo-showcase/provision";
import { provisionDemoShowcaseAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  durum?: string;
}>;

const statusLabels = [
  ["accounts", "Demo hesapları", "Okuyucu, yazar, üç editör ve iki yayınevi kullanıcısı"],
  ["works", "Eser durumları", "Taslak, public, editör aşamaları ve arşiv"],
  ["publicWorks", "Public keşif", "Eser/yazar keşfini dolu gösterecek public eserler"],
  ["comments", "Yorum ağı", "Okuyucu yorumları ve yazar cevapları"],
  ["readerProgress", "Okuma geçmişi", "Devam eden ve tamamlanmış okuma senaryoları"],
  ["editorAssignments", "Editör iş akışı", "1. editör, 2. editör ve dış editöre hazır durumlar"],
  ["publisher", "Demo yayınevi", "Doğrulanmış, aktif yayınevi ve ekip üyelikleri"],
  ["publisherScenarios", "Yayınevi senaryoları", "Paylaşım, yetki talebi, editör talebi ve başvurular"],
  ["notifications", "Bildirimler", "Rol bazlı okunmuş/okunmamış bildirim örnekleri"],
] as const;

function notice(durum: string | undefined) {
  if (durum === "hazir") {
    return {
      text: "Demo vitrini yeniden kuruldu. Girilen parola tüm demo hesaplarına uygulandı.",
      tone: "active",
    } as const;
  }

  if (durum === "zayif-parola") {
    return {
      text: "Parola en az 12 karakter olmalı ve en az bir harf ile bir rakam içermelidir.",
      tone: "pending",
    } as const;
  }

  if (durum === "hata") {
    return {
      text: "Demo verisi hazırlanamadı. Veritabanı ve uygulama loglarını kontrol edin.",
      tone: "pending",
    } as const;
  }

  return null;
}

export default async function AdminDemoShowcasePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const currentNotice = notice(query.durum);
  const status = await getDemoShowcaseStatus().catch(() => null);

  return (
    <div className="admin-directory-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">UAT · Demo Veri Merkezi</span>
          <h1>Gerçek özellikleri dolu veriyle göster</h1>
          <p>
            Yalnızca <strong>demo-*</strong> kullanıcıları, demo eserleri ve
            İlkOku Demo Yayınları verisi hazırlanır. Gerçek kullanıcılar,
            public tasarım ve onaylanmış ana sayfa bölümleri değiştirilmez.
          </p>
        </div>
      </header>

      {currentNotice ? (
        <section className="admin-panel" style={{ marginBottom: "1rem" }}>
          <span
            className="admin-table-badge"
            data-status={currentNotice.tone}
          >
            {query.durum === "hazir" ? "Hazır" : "Kontrol"}
          </span>
          <p style={{ marginBottom: 0 }}>{currentNotice.text}</p>
        </section>
      ) : null}

      <section className="admin-stats-grid">
        {statusLabels.slice(0, 5).map(([key, label, detail], index) => {
          const item = status?.[key] ?? null;
          const tone = ["indigo", "violet", "amber", "cyan", "rose"][index];

          return (
            <article className={`admin-stat admin-stat--${tone}`} key={key}>
              <div className="admin-stat__top">
                <span>{label}</span>
                <i>{item?.ready ? "✓" : "·"}</i>
              </div>
              <strong>
                {item ? `${item.current}/${item.expected}` : "—"}
              </strong>
              <p>{detail}</p>
            </article>
          );
        })}
      </section>

      <section className="admin-detail-grid" style={{ marginTop: "1rem" }}>
        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span>Eksik senaryolar</span>
              <h2>{status?.ready ? "Demo vitrini hazır" : "Hazırlanacak veri"}</h2>
            </div>
          </div>

          <dl className="admin-detail-list" style={{ marginTop: "1rem" }}>
            {statusLabels.slice(5).map(([key, label, detail]) => {
              const item = status?.[key] ?? null;
              return (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {item ? `${item.current}/${item.expected}` : "Okunamadı"}
                    {" · "}
                    {item?.ready ? "Hazır" : detail}
                  </dd>
                </div>
              );
            })}
          </dl>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span>Güvenli kurulum</span>
              <h2>Demo verisini hazırla / sıfırla</h2>
            </div>
          </div>
          <p>
            Aynı parola yalnız demo hesaplarında kullanılır. Parola repoya,
            audit kaydına veya ekrana yazılmaz. İşlem tekrar çalıştırılabilir;
            demo senaryolarını bilinen başlangıç durumuna getirir.
          </p>

          <form action={provisionDemoShowcaseAction}>
            <label
              htmlFor="demo-password"
              style={{ display: "grid", gap: ".45rem", margin: "1rem 0" }}
            >
              <strong>Demo hesap parolası</strong>
              <input
                autoComplete="new-password"
                id="demo-password"
                minLength={12}
                name="password"
                placeholder="En az 12 karakter, harf + rakam"
                required
                type="password"
                style={{
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(148,163,184,.18)",
                  borderRadius: ".8rem",
                  color: "#fff",
                  minHeight: "2.8rem",
                  padding: "0 .85rem",
                }}
              />
            </label>

            <button className="admin-button admin-button--primary" type="submit">
              Demo vitrini hazırla
            </button>
          </form>
        </article>
      </section>

      <section className="admin-panel" style={{ marginTop: "1rem" }}>
        <div className="admin-panel__heading">
          <div>
            <span>Hesap seti</span>
            <h2>Kurulacak demo kullanıcıları</h2>
          </div>
        </div>

        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Ad</th>
                <th>E-posta</th>
                <th>Gösterdiği ana senaryo</th>
              </tr>
            </thead>
            <tbody>
              {demoShowcaseAccounts.map((account) => {
                const scenario = {
                  reader: "Favori · okuma ilerlemesi · yorum",
                  writer: "Eserler · Eser Pasaportu · editör akışı",
                  editorA: "1. editör · yayınevi editör talebi",
                  editorB: "2. editör · editör önerisi",
                  externalEditor: "Dış ikinci editör hedef hesabı",
                  publisherOwner: "Keşif · ekip · paylaşım · başvurular",
                  publisherMember: "Kısıtlı yetki · paylaşım · yetki talebi",
                }[account.key];

                return (
                  <tr key={account.email}>
                    <td>
                      <span className="admin-table-badge" data-status="active">
                        {account.role}
                      </span>
                    </td>
                    <td>{account.fullName}</td>
                    <td>{account.email}</td>
                    <td>{scenario}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel" style={{ marginTop: "1rem" }}>
        <h2>Bu paket hangi eksikleri kapatır?</h2>
        <ul className="admin-policy-list">
          <li>9 eser durumu: taslak, arşiv ve 7 public eser.</li>
          <li>Okuyucuda favori, devam eden okuma, tamamlanan eser, yer imi ve riskli/normal okuma kaydı.</li>
          <li>Yazar yorumlarına cevap ve dolu Eser Pasaportu sahiplik/sürüm zinciri.</li>
          <li>1. editör bekleyen/aktif/tamamlanmış; 2. editör bekleyen/aktif/tamamlanmış durumları.</li>
          <li>Dış ikinci editör daveti oluşturmak için hazır eser ve ayrı aktif dış editör hedef hesabı.</li>
          <li>Yayınevinde beğeni, favori, yazar takibi, ekip içi/e-posta paylaşımı, ekip daveti ve yetki talebi.</li>
          <li>Yayınevi editör talebi, bekleyen/kabul edilmiş başvuru ve üretimde yayın planı.</li>
          <li>Her rolde okunmuş ve okunmamış bildirim örnekleri.</li>
        </ul>
      </section>
    </div>
  );
}
