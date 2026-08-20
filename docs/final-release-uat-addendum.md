# Final Release UAT — Current Product Addendum

## Amaç

Bu belge, tarihsel `docs/sprint-7-production-uat.md` içindeki 33 kritik kabul satırını değiştirmeden, Sprint 8–11 ve sonrasında canlı ürüne eklenen kritik çalışma yüzeylerini Final Release kabul kapısına dahil eder.

Bu addendum tek başına release kapısı değildir. Final Release durumu, tarihsel 33 satır + aşağıdaki 7 satır birlikte değerlendirilerek hesaplanır.

## Kabul kuralları

- Bir satır yalnız gerçek production hesabıyla ilgili akış tarayıcıda tamamlandıktan sonra `HUMAN_PASS` olabilir.
- CI, security contracts, Production Smoke ve `/harita` bütünlük denetimi insan kabulünün yerine geçmez; yalnız teknik kanıt sağlar.
- Credentials, cookie/session/token ve PII issue, doküman, log veya fixture içine yazılmaz.
- Başarısız akış `BLOCKED` yapılır; küçük corrective PR + CI + Production Smoke sonrasında aynı satır yeniden test edilir.
- Sistem Haritası ve Sözleşme Yönetimi kendi güvenlik sınırlarıyla test edilir; admin preview veya menü gizleme server-side yetkinin yerine geçmez.

## Admin / CMS güncel ürün yüzeyi

| Flow | Production path | Expected result | Automated | Human |
| --- | --- | --- | --- | --- |
| TR SEO operations | `/icerik/seo` | Teknik SEO, homepage, metadata, structured data ve TR-only sinyalleri server-side operasyon masasında açılır; yeni write bypass oluşmaz | AUTOMATED_PASS | HUMAN_PENDING |

## Sistem Haritası

| Flow | Production path | Expected result | Automated | Human |
| --- | --- | --- | --- | --- |
| Architecture control center | `/harita` | Gerçek admin route/menü/workflow/API/action/data/runtime bütünlük panellerini açar; BLOCKER/WARN/PASS sinyalleri görünür ve non-admin erişimi reddedilir | AUTOMATED_PASS | HUMAN_PENDING |

## Merkezi Sözleşme Yönetimi

| Flow | Production path | Expected result | Automated | Human |
| --- | --- | --- | --- | --- |
| Admin contract center | `/sozlesme` | Gerçek admin şablon ve sözleşme çalışma masasını açar; admin olmayan kullanıcı merkezi yönetim yetkisi alamaz | AUTOMATED_PASS | HUMAN_PENDING |
| Contract assignment / send | `/sozlesme` gönderim akışı | Admin gerçek kullanıcı + uygun rol şablonu + isteğe bağlı eser seçerek sözleşme gönderir; snapshot/version ve aktif tekrar koruması korunur | AUTOMATED_PASS | HUMAN_PENDING |
| Recipient contract inbox | `/sozlesmelerim` ve `/sozlesmelerim/{contractId}` | Gerçek alıcı yalnız kendisine ait sözleşmeleri listeler ve detayını açar; tüm aktif rol menülerindeki “Sözleşme Yönetimi” aynı inbox'a ulaşır | AUTOMATED_PASS | HUMAN_PENDING |
| Recipient response and admin history | `/sozlesmelerim/{contractId}` → `/sozlesme/{contractId}` | Alıcı kabul veya ret cevabı verir; admin güncel durum ve append-only olay geçmişini görür; işlem nitelikli elektronik imza olarak sunulmaz | AUTOMATED_PASS | HUMAN_PENDING |
| Contract ownership / authority negative check | direct contract URLs | Başka kullanıcı sözleşme detayını açamaz ve admin-only sözleşme mutation'larını çalıştıramaz; UI gizliliği yerine server/database ownership sınırı belirleyicidir | AUTOMATED_PASS | HUMAN_PENDING |

## Final toplam

- Tarihsel Sprint 7 matrisi: 33 kritik satır.
- Güncel ürün addendum: 7 kritik satır.
- Final Release toplamı: **40 kritik satır**.
- Bu addendum oluşturulduğunda tarihsel matriste 7 `HUMAN_PASS`, 26 `HUMAN_PENDING` vardır; addendumdaki 7 satırın tamamı `HUMAN_PENDING` başlar.
- Başlangıç Final Release durumu: **7 PASS · 33 PENDING · 0 BLOCKED**.
