import Link from "next/link";
import styles from "../SystemControlWorkbench.module.css";
import pageStyles from "./BannerAdvertisingPage.module.css";
import { requireCmsAdmin } from "@/lib/cms-access";
import {
  AFFILIATE_PLACEMENT_NAMESPACE,
  HOMEPAGE_AFTER_ROLES_PLACEMENT,
  parseAffiliatePlacementSetting,
} from "@/lib/affiliate-placement";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };

const DESKTOP_AFFILIATE_CODE = `<a href="https://www.dpbolvw.net/click-101886825-13992555"
   target="_blank"
   rel="sponsored nofollow noopener noreferrer">
  <img src="https://www.ftjcfx.com/image-101886825-13992555"
       width="728"
       height="90"
       alt="Magzter dergi ve gazete okuma kampanyası"
       border="0" />
</a>`;

const MOBILE_AFFILIATE_CODE = `<a href="https://www.jdoqocy.com/click-101886825-13992112"
   target="_blank"
   rel="sponsored nofollow noopener noreferrer">
  <img src="https://www.awltovhc.com/image-101886825-13992112"
       width="300"
       height="250"
       alt="Magzter dergi ve gazete okuma kampanyası"
       border="0" />
</a>`;

const TEXT_AFFILIATE_CODE = `<a href="https://www.jdoqocy.com/click-101886825-13973461"
   target="_blank"
   rel="sponsored nofollow noopener noreferrer">
  5.000'den fazla dergi, gazete ve seçilmiş premium içeriğe ücretsiz sınırsız erişim elde edin
</a>
<img src="https://www.tqlkg.com/image-101886825-13973461"
     width="1"
     height="1"
     border="0"
     alt="" />`;

export const dynamic = "force-dynamic";

async function loadPlacement() {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = ${AFFILIATE_PLACEMENT_NAMESPACE}
        AND contentKey = ${HOMEPAGE_AFTER_ROLES_PLACEMENT}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return { state: "ready" as const, enabled: true, firstRun: true };

    const parsed = parseAffiliatePlacementSetting(row.valueJson);
    if (!parsed) return { state: "invalid" as const };

    return { state: "ready" as const, enabled: parsed.enabled, firstRun: false };
  } catch {
    return { state: "read-error" as const };
  }
}

export default async function BannerAdvertisingPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  await requireCmsAdmin("/icerik/banner-reklam-alanlari");
  const params = await searchParams;
  const loaded = await loadPlacement();

  if (loaded.state !== "ready") {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading">
          <div>
            <span>Yayın & Görünürlük · Admin</span>
            <h1>Banner / Reklam Alanları</h1>
            <p>Mevcut reklam ayarı güvenilir biçimde okunmadan canlı görünürlük değiştirilmez.</p>
          </div>
        </div>
        <div className="content-panel" role="alert">
          <strong>{loaded.state === "read-error" ? "Reklam ayarı okunamadı." : "Reklam ayar kaydı geçersiz."}</strong>
          <p>Mevcut canlı davranış korunuyor. Sistem Sağlığı üzerinden veri kaynağını kontrol edin.</p>
          <div className="content-form-actions"><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div>
        </div>
      </section>
    );
  }

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Yayın & Görünürlük · Admin</span>
          <h1>Banner / Reklam Alanları</h1>
          <p>Şimdilik yalnızca ana sayfadaki Magzter reklam alanının görünürlüğünü yönetin ve kullanılan CJ kodlarını görüntüleyin.</p>
        </div>
        <div className="content-profile">
          <strong>{loaded.enabled ? "AKTİF" : "PASİF"}</strong>
          <small>Ana Sayfa · Rol Kartları Sonrası</small>
        </div>
      </div>

      {params.durum === "kaydedildi" ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="status">
          <strong>Reklam görünürlüğü güncellendi.</strong>
          <p>Ana sayfa önbelleği temizlendi; yeni durum canlı sayfaya uygulanır.</p>
        </div>
      ) : null}

      {params.durum === "hata" ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert">
          <strong>Reklam görünürlüğü kaydedilemedi.</strong>
          <p>Mevcut durum korunmuştur.</p>
        </div>
      ) : null}

      {loaded.firstRun ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>İlk kayıt henüz oluşturulmadı.</strong>
          <p>Mevcut canlı davranışı korumak için alan varsayılan olarak aktiftir.</p>
        </div>
      ) : null}

      <form action="/api/affiliate-placement" method="post" className={styles.workbench}>
        <input type="hidden" name="placement" value={HOMEPAGE_AFTER_ROLES_PLACEMENT} />

        <div className={styles.settingsGrid}>
          <section className={styles.settingCard}>
            <div className={styles.settingTop}>
              <div>
                <span className={styles.kicker}>Ana Sayfa</span>
                <h3>Rol Kartları Sonrası</h3>
              </div>
              <span className={styles.badge} data-tone={loaded.enabled ? "success" : "warning"}>
                {loaded.enabled ? "Aktif" : "Pasif"}
              </span>
            </div>

            <p>
              Magzter GOLD metin bağlantısı ile masaüstü 728×90 / mobil 300×250 kreatif alanını birlikte açar veya kapatır.
            </p>

            <div className={styles.options}>
              <label className={styles.option}>
                <input type="radio" name="enabled" value="active" defaultChecked={loaded.enabled} />
                <span>
                  <strong>Aktif</strong>
                  <small>Reklam alanı ana sayfada görünür.</small>
                </span>
              </label>

              <label className={styles.option}>
                <input type="radio" name="enabled" value="passive" defaultChecked={!loaded.enabled} />
                <span>
                  <strong>Pasif</strong>
                  <small>Reklam alanı tamamen gizlenir; sayfadaki diğer bölümler yerini korur.</small>
                </span>
              </label>
            </div>
          </section>

          <section className={styles.settingCard}>
            <div className={styles.settingTop}>
              <div>
                <span className={styles.kicker}>Kapsam</span>
                <h3>Tek reklam alanı</h3>
              </div>
              <span className={styles.badge}>1 alan</span>
            </div>
            <p>Şimdilik yalnızca onayladığımız ana sayfa konumu yönetiliyor. Yeni reklam alanları otomatik eklenmez.</p>
            <div className={styles.impactCard}>
              <strong>Aktif kreatifler</strong>
              <p>Masaüstü: 728×90 · Mobil: 300×250 · Sol metin bağlantısı: CJ AID 13973461.</p>
            </div>
          </section>
        </div>

        <section className={pageStyles.codeSection} aria-labelledby="affiliate-code-heading">
          <div className={pageStyles.codeHeader}>
            <div>
              <span>Teknik görünüm</span>
              <h2 id="affiliate-code-heading">Mevcut Affiliate Kodları</h2>
              <p>Canlıda kullanılan üç CJ kreatifi burada referans olarak gösterilir. Bu kutular yalnızca görüntüleme ve kopyalama içindir.</p>
            </div>
          </div>

          <div className={pageStyles.codeGrid}>
            <article className={pageStyles.codeCard}>
              <div className={pageStyles.codeCardHeader}>
                <div>
                  <span>Masaüstü</span>
                  <strong>728×90 Banner</strong>
                </div>
                <small>AID 13992555</small>
              </div>
              <textarea
                className={pageStyles.codeArea}
                aria-label="Masaüstü 728×90 affiliate kodu"
                readOnly
                rows={10}
                value={DESKTOP_AFFILIATE_CODE}
              />
            </article>

            <article className={pageStyles.codeCard}>
              <div className={pageStyles.codeCardHeader}>
                <div>
                  <span>Mobil</span>
                  <strong>300×250 Banner</strong>
                </div>
                <small>AID 13992112</small>
              </div>
              <textarea
                className={pageStyles.codeArea}
                aria-label="Mobil 300×250 affiliate kodu"
                readOnly
                rows={10}
                value={MOBILE_AFFILIATE_CODE}
              />
            </article>

            <article className={pageStyles.codeCard}>
              <div className={pageStyles.codeCardHeader}>
                <div>
                  <span>Metin kreatifi</span>
                  <strong>Affiliate link + takip pikseli</strong>
                </div>
                <small>AID 13973461</small>
              </div>
              <textarea
                className={pageStyles.codeArea}
                aria-label="Metin affiliate kodu ve takip pikseli"
                readOnly
                rows={11}
                value={TEXT_AFFILIATE_CODE}
              />
            </article>
          </div>
        </section>

        <div className={styles.saveBar}>
          <div>
            <strong>Canlı görünürlük kontrolü</strong>
            <small>Kaydetme yalnızca bu reklam alanının aktif/pasif durumunu değiştirir.</small>
          </div>
          <div className="content-form-actions">
            <Link href="/" target="_blank" rel="noopener noreferrer">Ana Sayfayı Aç</Link>
            <button type="submit">Durumu Kaydet</button>
          </div>
        </div>
      </form>
    </section>
  );
}
