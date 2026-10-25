import Link from "next/link";

import { istanbulBusinessDate } from "@/features/commerce/day-close-export";

export const dynamic = "force-dynamic";

function previousDay() {
  const current = istanbulBusinessDate(new Date());
  const [y, m, d] = current.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

export default async function DayCloseAccountingTransferPage() {
  const day = previousDay();
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Finans &amp; Gelirler · Salt okunur aktarım</span>
          <h1>Gün Sonu Muhasebe Aktarımı</h1>
          <p>Tamamlanmış Türkiye iş gününün sipariş, finans hareketi, iade ve
            kontrol kayıtlarını bir ZIP dosyasında dışa aktarın.</p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/finans-gelirler">
          Finans &amp; Gelirlere dön
        </Link>
      </header>
      <div className="admin-readonly-notice" role="status">
        <strong>İlkOku fatura düzenlemez.</strong>
        <p>Paket, dış muhasebe programına aktarılacak genel CSV ve JSON
          inceleme verisidir. e-Fatura, e-Arşiv, gider pusulası veya resmî
          muhasebe fişi değildir. Hangi muhasebe programına aktarılacağına
          göre sütun eşlemesi ayrıca onaylanmalıdır.</p>
        <p>Günler 00:00–24:00 Europe/Istanbul esasına göre ayrılır.
          Devam eden bugünün kapanışı alınamaz. Bu önizleme geçmiş kaydı,
          komisyon oranını, yazar bakiyesini ve ödeme durumunu değiştirmez.</p>
      </div>
      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Son kapanan gün varsayılan</span>
            <h2>Gün sonu paketini indir</h2>
          </div>
        </div>
        <form method="get" action="/sistem-yonetimi/finans-gelirler/gun-sonu-aktarim/indir"
          className="admin-commerce-toolbar">
          <label>
            <span>İş günü (Türkiye tarihi)</span>
            <input type="date" name="gun" defaultValue={day} max={day} required />
          </label>
          <button className="admin-button admin-button--primary" type="submit">
            ZIP gün sonu paketini indir
          </button>
        </form>
        <p>İndirme işlemi yalnızca yönetici oturumuna açıktır. Her indirme
          kaynak kayıtları tekrar okur; gün sonu kesin kilidi veya değişmez
          resmî muhasebe arşivi oluşturmaz.</p>
      </section>
      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>Paket dosyaları</h2>
          <p><code>siparisler.csv</code> — Sipariş no, dönem, fiyat, KDV,
            indirim, kayıtlı komisyon oranı ve inceleme sonucu.</p>
          <p><code>finans_hareketleri.csv</code> — Mevcut ledger kayıtları,
            hareket tipi ve kuruş bazlı tutar.</p>
          <p><code>iadeler.csv</code> — Tamamlanmış iadeler, sipariş tahsilatı,
            kapanış tarihine kadarki kümülatif iade ve kontrol sonucu.</p>
          <p><code>iade_ledger_mutabakat.csv</code> — Aynı iş günündeki
            işlenmiş iade kayıtları ile refund türündeki finans hareketlerini
            sipariş ve para birimi bazında karşılaştırır. Eksik hareket,
            yanlış toplam veya farklı muhasebeleştirme günü incelemeye ayrılır;
            bir hareketin eksikliği paranın iade edilmediğini kanıtlamaz.</p>
          <p><code>uyarilar.csv</code> — Eksik snapshot, kupon,
            mükerrer tahsilat, yanlış satıcı ve ledger uyuşmazlıkları.</p>
          <p><code>mutabakat.csv</code> — Sipariş brüt tutarını,
            tarihinden bağımsız ilgili siparişin sale_gross ledger kayıtlarıyla
            ve tamamlanma tarihi doğrulanan tahsilat bilgisiyle karşılaştırır.
            Sonradan iade edilmiş ödemelerde ilk tahsilatın kanıtı korunur;
            eksik veya çelişkili ödeme zamanı uyarıya ayrılır.</p>
          <p><code>gun_sonu_ozet.csv</code> — Gün içinde kaydedilen finans
            hareketlerinin tür ve para birimi bazında toplamı.
            Ledger toplamı muhasebe kârı değildir.</p>
          <p><code>muhasebe_on_hazirlik.csv</code> — Yalnız temel veri
            kontrollerini geçen satışlar için programdan bağımsız, kesin
            mali belge sayılmayan aktarım alanları.</p>
          <p><code>yazar_hesap_ozeti.csv</code> — Temel kontrolleri
            geçen işlemlerin yazar ve mali belge türüne göre toplamları:
            komisyon ve koşullu aracılık ayrı hesaplama örnekleridir.</p>
          <p><code>muhasebe_tl_inceleme.csv</code> — Kontrolü geçen
            satışların TL tutarlarıyla, noktalı virgül ayracı ve
            virgüllü iki ondalık içeren muhasebeci inceleme tablosu.
            Resmî fiş veya doğrulanmış program içe aktarma formatı değildir.</p>
          <p><code>alan_esleme.json</code> — Alan tanımları ve Logo, Mikro,
            Paraşüt şemalarının henüz doğrulanmadığı bilgisi.</p>
          <p><code>manifest.json</code> — İş günü, içerik sayıları,
            sürüm, dosya SHA-256 özetleri ve kontrol durumu.</p>
        </article>
        <article className="admin-panel">
          <h2>Aktarım ve muhasebe kontrolü</h2>
          <p>Dosyalarda tutarlar <strong>kuruş</strong> olarak, tarihler
            UTC ISO 8601 biçiminde saklanır; iş günü Türkiye saatidir.</p>
          <p>Genel komisyon %15, varsa siparişe sabitlenmiş yazar/eser
            oranı kullanılır. Sipariş tarihinde geçerli yönetici incelemesi
            bulunan ticari fatura veya serbest meslek makbuzu düzenleyen
            yazarda aracılık oranı %0; doğrulanmış GVK 18 kapsamında
            koşullu aracılık oranı %5 olarak ayrı hesaplanır.</p>
          <p>Yazarın mali belge incelemesi yoksa, tarihi geçmişse,
            geri alınmışsa veya siparişten sonraysa işlem uyarıya ayrılır.
            Bu oranlar yalnız muhasebe aktarımında inceleme amaçlıdır:
            İlkOku hizmet faturası veya vergi belgesi düzenlemez.</p>
          <p>Alıcı fatura bilgileri, resmî belge numarası ve mali müşavir
            onayı burada üretilmez. <code>muhasebe_on_hazirlik.csv</code>
            dosyasındaki satırlar bile fatura düzenleme onayı değildir.
            Doğrulanmamış kayıtlar <code>uyarilar.csv</code> üzerinden incelenmelidir.</p>
          <p>Logo, Mikro ve Paraşüt için resmî içe aktarma şeması
            doğrulanmadan dosyalar doğrudan uyumlu olarak işaretlenmez.
            Her ürünün sürümü, resmî Excel şablonu veya desteklediği muhasebe
            aktarım türü ayrıca onaylanmalıdır.</p>
        </article>
      </section>
    </>
  );
}
