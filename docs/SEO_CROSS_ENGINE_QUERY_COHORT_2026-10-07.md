# İlkOku · Yandex / Google ortak sorgu kohortu — 2026-10-07

## Amaç

Yandex Webmaster'daki sorgu grupları ile Google Search Console Search Analytics ölçümünü aynı arama niyeti ve aynı hedef açılış sayfalarında birleştirmek.

Google Search Console'da Yandex'teki gibi kalıcı manuel sorgu grubu nesnesi bulunmadığı için aynı kohort Search Analytics API içindeki `includingRegex` filtreleriyle günlük raporlanır.

## Ortak gruplar

| Grup | Ana hedef sayfalar |
| --- | --- |
| İlkOku Marka | `/`, `/nasil-calisir` |
| Yazarlar | `/yazarlar-icin` |
| Yazarlık Türleri | 7 kategori hub'ı + Roman, Öykü, Fantastik, Bilim Kurgu, Distopya, Şiir |
| Okurlar | `/okurlar-icin`, `/okurlar-icin/okumaya-baslama` |
| Editörler | `/editorler-icin` + 3 öncelikli editör eğitimi |
| Yayınevleri | `/yayinevleri-icin` |
| Süreç ve Editoryal Güven | `/editoryal-standartlar`, `/hakkimizda`, `/nasil-calisir` |

Kaynak sorgular ve landing-page eşleşmeleri `scripts/seo-priority-query-cohort.mjs` dosyasında tek kaynaktan yönetilir.

## Çapraz motor bulgusu

### Yandex

2026-10-07 kamu araması, yeni İlkOku sayfalarının yanında eski `www.ilkoku.com` haber geçmişinden URL'ler göstermeye devam ediyor. Örnekler:

- `https://www.ilkoku.com/puan-durumu/`
- `https://www.ilkoku.com/namaz-vakitleri/`
- `https://www.ilkoku.com/page/`
- eski `https://www.ilkoku.com/hakkimizda/` snippet'i

Canlı doğrulamada ilk üç eski yol non-www sürümünde gerçek HTTP 404 veriyor. `/hakkimizda` ise güncel sayfaya ve doğru canonical'a açılıyor.

Yandex Webmaster'da eski 404 URL'leri **Araçlar → Arama sonuçlarından sayfaları kaldır** alanından kaldırma kuyruğuna vermek uygundur. 404 yanıtları korunmalıdır; eski ilgisiz URL'ler ana sayfaya 301 ile taşınmamalıdır.

### Google

Kamu aramasında aynı eski haber URL'leri bulunmadı. Buna rağmen URL Inspection ana sayfa verisinde eski `www.ilkoku.com` adresleri referring URL olarak görüldü; yani geçmiş crawl ilişkisi tamamen kaybolmuş değildir.

Google tarafında yapılacaklar:

- mevcut gerçek 404 yanıtlarını koru,
- güncel 25 URL sitemap'ini koru,
- öncelikli 24 sayfayı URL Inspection / census ile izle,
- bu dosyadaki ortak sorgu kohortunu Search Analytics API ile takip et,
- yanlış landing-page eşleşmelerini cannibalization adayı olarak incele.

## Değiştirilmemesi gerekenler

- Eski ilgisiz haber URL'lerini ana sayfaya toplu 301 yönlendirme yapma.
- 404 URL'leri yeniden sitemap'e ekleme.
- Öncelikli sayfaların canonical'larını değiştirme.
- Soft-launch noindex politikasını genişletme.
