import Link from "next/link";
import { AffiliatePlacementWorkbench } from "./AffiliatePlacementWorkbench";
import { requireCmsAdmin } from "@/lib/cms-access";
import {
  AFFILIATE_PLACEMENT_NAMESPACE,
  HOMEPAGE_AFTER_ROLES_PLACEMENT,
  defaultAffiliatePlacementSetting,
  parseAffiliatePlacementSetting,
} from "@/lib/affiliate-placement";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };

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
    if (!row) {
      return {
        state: "ready" as const,
        setting: defaultAffiliatePlacementSetting,
        firstRun: true,
      };
    }

    const parsed = parseAffiliatePlacementSetting(row.valueJson);
    if (!parsed) return { state: "invalid" as const };

    return { state: "ready" as const, setting: parsed, firstRun: false };
  } catch {
    return { state: "read-error" as const };
  }
}

function errorMessage(status: string | undefined) {
  if (status === "gecersiz-baslik") return "Kampanya başlığı boş bırakılamaz ve 140 karakteri geçemez.";
  if (status === "gecersiz-desktop") return "Masaüstü kreatifi geçerli bir HTTPS 728×90 banner kodu değil.";
  if (status === "gecersiz-mobile") return "Mobil kreatifi geçerli bir HTTPS 300×250 banner kodu değil.";
  if (status === "gecersiz-text") return "Metin kreatifi geçerli bir HTTPS affiliate linki / 1×1 takip pikseli değil.";
  if (status === "kod-cok-uzun") return "Affiliate kodlarından biri izin verilen boyutu aşıyor.";
  if (status === "hata") return "Değişiklikler kaydedilemedi; mevcut canlı kayıt korunmuştur.";
  return null;
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

  const failure = errorMessage(params.durum);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Yayın & Görünürlük · Admin</span>
          <h1>Banner / Reklam Alanları</h1>
          <p>Aktif/pasif durumunu, kampanya başlığını ve masaüstü / mobil / metin kreatiflerini tek yerden yönetin.</p>
        </div>
        <div className="content-profile">
          <strong>{loaded.setting.enabled ? "AKTİF" : "PASİF"}</strong>
          <small>Ana Sayfa · Rol Kartları Sonrası</small>
        </div>
      </div>

      {params.durum === "kaydedildi" ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="status">
          <strong>Reklam alanı güncellendi.</strong>
          <p>Yeni başlık ve kreatifler doğrulandı, ana sayfa önbelleği temizlendi ve canlı kayıt güncellendi.</p>
        </div>
      ) : null}

      {failure ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert">
          <strong>Değişiklik uygulanmadı.</strong>
          <p>{failure}</p>
        </div>
      ) : null}

      {loaded.firstRun ? (
        <div className="content-panel" style={{ marginBottom: "1rem" }}>
          <strong>İlk kayıt henüz oluşturulmadı.</strong>
          <p>Mevcut Magzter kampanyası varsayılan olarak yüklenmiştir. Düzenleyip kaydettiğinizde kalıcı kayıt oluşturulur.</p>
        </div>
      ) : null}

      <AffiliatePlacementWorkbench
        initialSetting={loaded.setting}
        firstRun={loaded.firstRun}
      />
    </section>
  );
}
