import Link from "next/link";
import { CmsWriterMotivationEditor } from "@/components/content/CmsWriterMotivationEditor";
import { requireCmsManager } from "@/lib/cms-access";
import { loadWriterMotivationsForCms } from "@/lib/writer-engagement";

export const dynamic = "force-dynamic";

export default async function WriterMotivationPage({
  searchParams,
}: {
  searchParams: Promise<{ kaydedildi?: string; hata?: string }>;
}) {
  const access = await requireCmsManager("/icerik/motivasyon");
  const params = await searchParams;
  const loaded = await loadWriterMotivationsForCms();

  if (loaded.state !== "ready") {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading">
          <div>
            <span>İçerik · Yazar</span>
            <h1>Motivasyon Yazıları</h1>
            <p>
              Mevcut motivasyon serisi güvenilir biçimde okunmadan canlı yazar paneli içeriği değiştirilemez.
            </p>
          </div>
        </div>
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>
            {loaded.state === "read-error"
              ? "Motivasyon kaydı okunamadı."
              : "Motivasyon kaydı geçersiz."}
          </strong>
          <p>
            Varsayılan 30 günlük seri public tarafta güvenli yedek olarak kalır; bozuk veya okunamayan CMS kaydının üzerine sessizce yazılmaz.
          </p>
          <div className="content-form-actions">
            <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
            <Link href="/icerik/motivasyon">Tekrar dene</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik · Yazar</span>
          <h1>Motivasyon Yazıları</h1>
          <p>
            Yazar panelindeki günlük motivasyonu kullanıcı bazlı aktif gün sırasına göre yönetin. İlk 30 mesaj hazır gelir; 31. günden itibaren yeni mesajlar ekleyebilirsiniz.
          </p>
        </div>
        <aside
          className="cms-editor-status-card"
          data-tone="success"
          aria-label="Motivasyon serisi durumu"
        >
          <span className="cms-editor-status-card__label">Seri kaynağı</span>
          <strong>{loaded.firstRun ? "İlkOku 30 günlük başlangıç serisi" : "CMS yönetimli"}</strong>
          <div className="cms-editor-status-card__meta">
            <span className="cms-editor-chip is-positive">Kullanıcı bazlı</span>
            <span className="cms-editor-chip">Europe/Istanbul günü</span>
          </div>
        </aside>
      </div>

      <nav className="cms-editor-toolbar" aria-label="Motivasyon hızlı işlemleri">
        <div className="cms-editor-toolbar__cluster">
          <Link href="/icerik">← İçerik Yönetimi</Link>
          <Link href="/yazar" target="_blank">Yazar panelini aç ↗</Link>
        </div>
      </nav>

      {params.kaydedildi ? (
        <div className="content-panel cms-editor-notice is-info" role="status">
          <strong>Motivasyon serisi güncellendi.</strong>
          <p>Yeni sıra yazar panellerinde kullanıcıların aktif gün sayılarına göre kullanılacak.</p>
        </div>
      ) : null}

      {params.hata ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>Motivasyon serisi kaydedilemedi.</strong>
          <p>
            {params.hata === "seri"
              ? "En az 30 geçerli motivasyon bulunmalı; her mesaj 4–240 karakter arasında olmalı."
              : "Veritabanı kaydı tamamlanamadı; mevcut canlı seri korunuyor."}
          </p>
        </div>
      ) : null}

      <div className="content-panel cms-editor-notice is-info">
        <strong>Aktif gün nasıl sayılır?</strong>
        <p>
          Kullanıcı yazar panelini gerçekten açtığında o İstanbul takvim günü bir kez kaydedilir. Aynı gün tekrar giriş, sayfa yenileme veya farklı cihaz ikinci gün oluşturmaz. Bir gün atlanırsa seri sıfırlanmaz; sonraki giriş kullanıcının bir sonraki aktif günü olur.
        </p>
      </div>

      {!access.canPublish ? (
        <div className="content-panel cms-editor-notice is-danger" style={{ marginTop: "1rem" }}>
          <strong>Yayın yetkisi gerekli.</strong>
          <p>Bu alan yazar panelini doğrudan etkilediği için yalnız yayın yetkisi olan içerik yöneticileri canlı seriyi değiştirebilir.</p>
        </div>
      ) : null}

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <CmsWriterMotivationEditor
          canPublish={access.canPublish}
          initialMotivations={loaded.motivations}
        />
      </div>
    </section>
  );
}
