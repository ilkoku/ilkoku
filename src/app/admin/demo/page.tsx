import { provisionDemoShowcaseAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  asama?: string;
  durum?: string;
  kod?: string;
}>;

const demoWriters = [
  [1, "Defne Aras — Demo Yazar", 19, "İstanbul", "Fantastik", "Editör incelemesi yok", "demo-defne-aras@ilkoku.com"],
  [2, "Emir Sancak — Demo Yazar", 23, "İzmir", "Gençlik", "1. editör bekliyor", "demo-emir-sancak@ilkoku.com"],
  [3, "Selin Yalçın — Demo Yazar", 27, "Ankara", "Polisiye", "1. editör incelemesinde", "demo-selin-yalcin@ilkoku.com"],
  [4, "Kerem Aydın — Demo Yazar", 31, "Bursa", "Psikolojik Roman", "2. editör bekliyor", "demo-kerem-aydin@ilkoku.com"],
  [5, "Duru Erdem — Demo Yazar", 35, "Antalya", "Bilim Kurgu", "2. editör incelemesinde", "demo-duru-erdem@ilkoku.com"],
  [6, "Baran Koç — Demo Yazar", 39, "Eskişehir", "Tarihî Kurgu", "2 editör tamamlandı", "demo-baran-koc@ilkoku.com"],
  [7, "Nehir Demir — Demo Yazar", 43, "İstanbul", "Gerilim", "Editörler tamam · okur etkileşimi", "demo-nehir-demir@ilkoku.com"],
  [8, "Mert Ekinci — Demo Yazar", 47, "Çanakkale", "Edebî Roman", "Yayınevi keşfinde", "demo-mert-ekinci@ilkoku.com"],
  [9, "İpek Aksoy — Demo Yazar", 52, "Ankara", "Macera", "Yayınevi ilgisi güçlü", "demo-ipek-aksoy@ilkoku.com"],
  [10, "Arda Koral — Demo Yazar", 57, "İzmir", "Roman · Öykü · Gizem", "Uçtan uca olgun profil", "demo-yazar@ilkoku.com"],
] as const;

const supportAccounts = [
  ["reader", "İlkOku Demo Okuyucu", "demo-okuyucu@ilkoku.com", "Favori · okuma ilerlemesi · yorum"],
  ["editor", "İlkOku Demo Editör A", "demo-editor-a@ilkoku.com", "1. editör · yayınevi editör talebi"],
  ["editor", "İlkOku Demo Editör B", "demo-editor-b@ilkoku.com", "2. editör · editör önerisi"],
  ["editor", "İlkOku Demo Dış Editör", "demo-dis-editor@ilkoku.com", "Dış ikinci editör hedef hesabı"],
  ["publisher", "İlkOku Demo Yayınevi Sahibi", "demo-yayinevi@ilkoku.com", "Keşif · ekip · paylaşım · başvurular"],
  ["publisher", "İlkOku Demo Yayınevi Editoryal", "demo-yayinevi-ekip@ilkoku.com", "Kısıtlı yetki · paylaşım · yetki talebi"],
] as const;

const expectedScenarios = [
  ["10", "Demo yazarlar", "Farklı yaş, şehir, tür ve kademe"],
  ["16", "Demo hesapları", "10 yazar + okuyucu + 3 editör + 2 yayınevi"],
  ["18", "Demo eserler", "16 public + taslak + arşiv"],
  ["24+", "Editör akışı", "1. ve 2. editör durumları"],
  ["7+", "Yayınevi senaryoları", "Takip, paylaşım, talep ve başvuru"],
] as const;

function notice(query: { asama?: string; durum?: string; kod?: string }) {
  if (query.durum === "hazir") {
    return {
      label: "Hazır",
      text: "Demo vitrini kuruldu. Girilen parola bütün demo hesaplarına uygulandı.",
      tone: "active",
    } as const;
  }

  if (query.durum === "zayif-parola") {
    return {
      label: "Kontrol",
      text: "Parola en az 12 karakter olmalı ve en az bir harf ile bir rakam içermelidir.",
      tone: "pending",
    } as const;
  }

  if (query.durum === "hata") {
    const phase = query.asama ? ` Aşama: ${query.asama}.` : "";
    const code = query.kod ? ` Kod: ${query.kod}.` : "";
    return {
      label: "Hata",
      text: `Demo verisi hazırlanamadı.${phase}${code} Bu güvenli teşhis kodunu geliştirme ekibiyle paylaşın.`,
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
  const currentNotice = notice(query);

  return (
    <div className="admin-directory-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">UAT · Demo Veri Merkezi</span>
          <h1>Gerçek özellikleri dolu veriyle göster</h1>
          <p>
            Bu ekran artık açılırken veritabanından demo sayaçları okumaz. Böylece
            kurulum öncesi bir veri/schema sorunu yönetim sayfasını düşürmez; gerçek
            kurulum hatası güvenli aşama ve hata koduyla görünür olur.
          </p>
        </div>
      </header>

      {currentNotice ? (
        <section className="admin-panel" style={{ marginBottom: "1rem" }}>
          <span className="admin-table-badge" data-status={currentNotice.tone}>
            {currentNotice.label}
          </span>
          <p style={{ marginBottom: 0 }}>{currentNotice.text}</p>
        </section>
      ) : null}

      <section className="admin-stats-grid">
        {expectedScenarios.map(([count, label, detail], index) => {
          const tone = ["indigo", "violet", "amber", "cyan", "rose"][index];
          return (
            <article className={`admin-stat admin-stat--${tone}`} key={label}>
              <div className="admin-stat__top">
                <span>{label}</span>
                <i>·</i>
              </div>
              <strong>{count}</strong>
              <p>{detail}</p>
            </article>
          );
        })}
      </section>

      <section className="admin-detail-grid" style={{ marginTop: "1rem" }}>
        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span>Kurulum kapsamı</span>
              <h2>Demo vitrini senaryoları</h2>
            </div>
          </div>
          <ul className="admin-policy-list">
            <li>Okuyucu: favori, okuma ilerlemesi, yer imi, yorum ve okuma güvenliği.</li>
            <li>Yazar: bölüm yayını, yorum cevabı, editör akışı ve Eser Pasaportu.</li>
            <li>Editör: 1. ve 2. editör, öneri ve yayınevi editör talebi.</li>
            <li>Yayınevi: beğeni, favori, takip, ekip paylaşımı ve yetki talebi.</li>
            <li>Başvuru: bekleyen/kabul edilmiş dosya ve üretimde yayın planı.</li>
          </ul>
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
            audit kaydına veya ekrana yazılmaz. İşlem gerçek kullanıcıları değiştirmez.
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
            <span>10 ayrı kademe</span>
            <h2>Demo yazarlar</h2>
          </div>
        </div>
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Yazar</th>
                <th>Yaş</th>
                <th>Şehir</th>
                <th>Tür</th>
                <th>Sistem aşaması</th>
                <th>Giriş e-postası</th>
              </tr>
            </thead>
            <tbody>
              {demoWriters.map(([level, name, age, city, genre, stage, email]) => (
                <tr key={email}>
                  <td><span className="admin-table-badge" data-status="active">{level}</span></td>
                  <td>{name}</td>
                  <td>{age}</td>
                  <td>{city}</td>
                  <td>{genre}</td>
                  <td>{stage}</td>
                  <td>{email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel" style={{ marginTop: "1rem" }}>
        <div className="admin-panel__heading">
          <div>
            <span>Diğer roller</span>
            <h2>Okuyucu · editör · yayınevi demo hesapları</h2>
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
              {supportAccounts.map(([role, name, email, scenario]) => (
                <tr key={email}>
                  <td><span className="admin-table-badge" data-status="active">{role}</span></td>
                  <td>{name}</td>
                  <td>{email}</td>
                  <td>{scenario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
