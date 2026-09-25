# İlkOku Kitap Endeksi V1

## Amaç

İlkOku Kitap Endeksi, dış kitap satış platformlarının kendi çok satan
listelerini kaynak bazında takip eder, sıralama snapshot'larını tarihsel olarak
saklar ve ayrı bir **İlkOku Türkiye Kitap Endeksi** üretir.

Bu ürün dış kaynak listesini İlkOku satışı gibi göstermemelidir.

## Değişmez ürün kuralları

1. Kaynak sıralaması kaynak adına gösterilir; İlkOku tarafından yeniden
   adlandırılmaz.
2. İlkOku Türkiye Endeksi ayrı bir bileşik sıralamadır.
3. Türkiye Endeksi'nde **1 kaynak = 1 oy**.
4. Başlangıç uygunluk eşiği **en az 3 bağımsız Türkiye kaynağıdır**.
5. Kaynaklar başlangıçta eşit ağırlıklıdır.
6. Amazon Türkiye Türkiye Endeksi'ne katılabilir.
7. Amazon ABD ayrı pazardır ve Türkiye Endeksi'ne katılmaz.
8. Ham gözlemler overwrite edilmez; her fetch run kendi snapshot'ını korur.
9. Eşleştirme önceliği: ISBN-13 → ISBN-10 → normalize başlık+yazar →
   admin manuel eşleştirme.
10. Bir kaynak adaptörünün bozulması diğer kaynakların collection akışını
    durdurmamalıdır.
11. Public SEO sayfaları veri kalitesi ve yeterli tarihsel kapsam oluşmadan
    indexe açılmaz.
12. Sponsor içerik organik sıralamayı asla değiştiremez. Sponsor slotları
    açıkça "Sponsorlu" olarak ayrılır ve sponsor yoksa public layout'ta boşluk
    bırakmaz.

## V1 çekirdek kaynaklar

- Kitapyurdu
- BKM Kitap
- D&R
- idefix
- Penguen Kitabevi
- Remzi Kitabevi
- Amazon Türkiye
- Amazon ABD — ayrı pazar

## Faz 2 kaynak adayları

KitapSepeti, KitapSeç, Kitapzen, İnkılâp Kitabevi, Hepsiburada, Trendyol,
PttAVM.

## Veri katmanları

### Kaynak

`BookIndexSource`, dış platformun kimliğini ve Türkiye Endeksi'ne dahil olup
olmadığını tutar.

### Kaynak listesi

`BookIndexList`, kaynak içindeki belirli çok satan listesini tanımlar.
Kategori, dönem, maksimum sıra, kaynak URL ve composite eligibility burada
saklanır.

### Dış kitap

`BookIndexExternalBook`, kaynağın gördüğü kitabın kaynağa özgü kaydıdır.
Kaynak metni korunur; master kitapla eşleşme ayrı tutulur.

### Master kitap

`BookIndexBook`, aynı kitabın farklı platform kayıtlarını birleştiren
İlkOku kimliğidir.

### Fetch run ve observation

`BookIndexFetchRun` kaynak liste çekimini izole eder.
`BookIndexObservation` o run içindeki rank snapshot'ıdır. Geçmiş observation
silinmez ve güncel rank ile overwrite edilmez.

## Türkiye Endeksi V1 hesaplama kontratı

Bir listenin rankı `1..N` aralığında 1–100 ölçeğine normalize edilir:

`score = ((N - rank + 1) / N) * 100`

Aynı kaynak birden fazla uygun gözlem üretirse önce explicit list priority,
eşitlikte en güncel gözlem seçilir. Böylece tek kaynak birden fazla oy
üretemez.

En az üç benzersiz Türkiye kaynağı bulunmadığında kitap Türkiye Endeksi için
uygun değildir.

İlk V1'de kaynak ağırlıkları eşittir. İleride ağırlık değişecekse algoritma
versiyonlanmalı ve geçmiş endeks sonuçlarının hangi versiyonla hesaplandığı
saklanmalıdır.

## Yönetim yüzeyi

Tek giriş noktası:

`/sistem-yonetimi/kitap-endeksi`

Bu alan ileride planlanan **Ana Panel** konsolidasyonuna uyumlu kalmalıdır;
Kitap Endeksi için ikinci bir bağımsız admin kabuğu oluşturulmamalıdır.

Yönetim ekranında zamanla:

- kaynak sağlık durumu,
- son başarılı/başarısız run,
- eşleşmeyen kitaplar,
- manuel eşleştirme,
- kaynak aç/kapat,
- liste ve scheduler durumu,
- public SEO readiness

yer alacaktır.

## Public/SEO rollout

İlk foundation PR public indexable sayfa oluşturmaz.

Public rollout ancak gerçek veri biriktikten sonra yapılır:

- `/en-cok-satanlar`
- `/en-cok-satanlar/turkiye`
- `/en-cok-satanlar/amazon-tr`
- `/en-cok-satanlar/amazon-us`
- kaynak sayfaları
- kategori sayfaları
- yükselenler / yeni girişler / her yerde satanlar / uzun satanlar
- tarihsel arşiv

Sitemap açılımı ayrı bir kalite kapısından geçmelidir.

## Sponsor entegrasyonu

Sponsor altyapısı default OFF kalır. İleride:

- 7 ana yazarlık kategorisi,
- tür/eğitim rehberleri,
- Kitap Endeksi kategori sayfaları,
- bestseller liste içi sponsor kartları

için slotlar açılabilir.

Sponsorlu kartlar organik rank dizisine eklenmez ve sıra numarası almaz.
