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

## GitHub Actions ile çalışma

`Public Load Test` workflow'u yalnızca manuel `workflow_dispatch` ile çalışır. Production üzerinde yanlışlıkla yük oluşturmamak için `RUN-PUBLIC-LOAD-TEST` onay metni zorunludur. Workflow yalnızca `https://ilkoku.com` veya `https://www.ilkoku.com` hedefini kabul eder.

## PASS eşikleri

Test aşağıdaki eşikleri kullanır:

- HTTP hata oranı `< %1`
- check başarısı `> %99`
- p95 yanıt süresi `< 1500 ms`
- p99 yanıt süresi `< 3000 ms`

Bu değerler ilk teknik eşiklerdir. Gerçek kapasite kararı yalnızca sonuçlarla birlikte değerlendirilir.

## Sonuç dosyası

Her çalışma sonunda `load-summary.json` üretilir. GitHub Actions çalışmasında önemli metrikler ayrıca workflow loguna yazdırılır.

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

## Hostinger yüksek yük / origin-direct için ek koruma

`tests/load/hostinger-support-1000.js` **1.000 sanal kullanıcıya kadar**
çıkabilen ayrı bir senaryodur. `tests/load/hostinger-origin-direct.js`
ise Cloudflare aracısını atlayarak belirtilen origin IP'sine bağlanabilir.
Bu betikler **normal doğrulama, hata teşhisi veya otomatik CI testi değildir**.

Artık her ikisi de çalıştırılmadan önce **ayrı bir açık onay değişkenini**
zorunlu kılar. Onay yoksa k6 betiği daha ilk aşamada hata vererek
**tek bir HTTP isteği bile göndermeden** durur. Her iki senaryo için de
yük düzeyi, hedef origin, test saati ve alternatif sitesi etkileri
operatör tarafından ayrıca onaylanmalıdır.

- 1.000 VU betiğinin onayı: `ILKOKU_STRESS_APPROVAL`;
  beklenen metin `APPROVE-ILKOKU-1000-VU`.
- Origin-direct betiğinin onayı: `ILKOKU_ORIGIN_DIRECT_APPROVAL`;
  beklenen metin `APPROVE-ORIGIN-DIRECT-PROBE`.

Aynı şekilde `tests/load/public-baseline.js` içindeki
`capacity100`, `capacity200`, `diagnostic150` ve
`distributedprobe100` profilleri doğrudan k6 ile çalıştırıldığında
`ILKOKU_HIGH_LOAD_APPROVAL=RUN-PUBLIC-LOAD-TEST` onayını zorunlu kılar.
Mevcut manuel GitHub workflow'u bu onayı doğruladıktan sonra k6
konteynerine iletir. `smoke` ve `baseline` profilleri değişmemiştir.

Mevcut GitHub `Public Load Test` iş akışı zaten yalnızca
`workflow_dispatch` ile ve `RUN-PUBLIC-LOAD-TEST` onayıyla çalışır;
bu değişiklik onun çalışma seçeneklerini veya otomatik izlemeyi
değiştirmez. Hiçbir yeni yük testi çalıştırılmadı.

**Arıza kanıtı sınırı:** Yük betiklerinin depoda bulunması, 20 Ekim 503
veya 23 Ekim 525 olaylarında çalıştırıldıkları anlamına gelmez.
Bu koruma geçmiş arızanın nedeni için kanıt oluşturmaz ve 503/525'i
tek başına onarmaz; kazara yeni yüksek yük yaratılmasını önler.
