# İlkOku Yük Testi

Bu klasör İlkOku'nun sentetik kapasite/yük testlerini içerir.

## Güvenlik kuralı

- Production üzerinde otomatik stress testi çalıştırılmaz.
- İlk aşama yalnızca public GET sayfalarını test eder.
- Kayıt oluşturma, giriş denemesi, yorum, favori veya başka bir veri yazma işlemi yapılmaz.
- `baseline` profili en fazla 50 eşzamanlı sanal kullanıcıya çıkar.
- 50 üzerindeki testler ayrı bir kapasite/stress senaryosu ve açık onay ile eklenmelidir.

## Test edilen sayfalar

- `/`
- `/giris`
- `/kayit`

## Profil 1 — smoke

Çok düşük etkili doğrulama:

- 2 VU
- yaklaşık 40 saniye

```bash
k6 run -e BASE_URL=https://ilkoku.com -e PROFILE=smoke tests/load/public-baseline.js
```

## Profil 2 — baseline

Kontrollü public kapasite başlangıcı:

- 10 VU
- 25 VU
- 50 VU
- gerçek kullanıcı düşünme süresi içerir

```bash
k6 run -e BASE_URL=https://ilkoku.com -e PROFILE=baseline tests/load/public-baseline.js
```

## PASS eşikleri

Test aşağıdaki eşikleri kullanır:

- HTTP hata oranı `< %1`
- check başarısı `> %99`
- p95 yanıt süresi `< 1500 ms`
- p99 yanıt süresi `< 3000 ms`

Bu değerler ilk teknik eşiklerdir. Gerçek kapasite kararı yalnızca sonuçlarla birlikte değerlendirilir.

## Sonuç dosyası

Her çalışma sonunda `load-summary.json` üretilir. GitHub Actions üzerinden çalıştırıldığında bu dosya artifact olarak saklanır.

Önemli metrikler:

- `http_req_failed`
- `http_req_duration`
- `checks`
- `page_failure_rate`
- `page_duration`

## Sonraki aşama

Public baseline temiz geçtikten sonra ayrı senaryolar hazırlanacaktır:

1. authenticated okuma yükü,
2. DB ağırlıklı karma kullanım,
3. kontrollü 100+ VU capacity/stress testi.

Bu sonraki senaryolar production'a veri yazmadan önce sentetik test hesapları ve açık çalışma sınırları ile hazırlanmalıdır.
