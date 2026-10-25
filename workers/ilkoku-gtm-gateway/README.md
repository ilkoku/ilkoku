# İlkOku — Google Tag Gateway: otomatik enjeksiyonsuz kalıcı geçiş

**Amaç:** İzin öncesi `/1q6z/` yüklemesini tamamen kaldırırken, izin sonrası GTM-W6NVSMNV ve olay ölçümünü korumak. DNS / ad sunucuları değişmeyecek.

## Neden gerekli?

Canlı denetimlerde otomatik Cloudflare Gateway, `Set up tag` kapalı olmasına rağmen izin öncesi HTML'ye betik ekledi. Uygulama kodundan yapılan `no-transform` veya konteyner yeniden kullanım deneyleri sorunu kaldırmadı. Google'ın resmî Self-service kurulumu, isteği `fps.goog` hizmetine CDN üzerinden yönlendirmeyi ve kodun kendi yükleme zamanını yönetmesini destekliyor. Cloudflare'ın otomatik entegre ürünü zone genelinde etkindir; Configuration Rules ile HTML enjeksiyonunu kısıtlamak mümkün değildir.

Google resmî kaynak: https://developers.google.com/tag-platform/tag-manager/gateway/setup-guide?setup=manual

Cloudflare ürün sınırları: https://developers.cloudflare.com/google-tag-gateway/

## Hazırlanan çözüm

- Worker: `workers/ilkoku-gtm-gateway/index.mjs`.
- Route: `ilkoku.com/ilkgtm/*` (eski `/1q6z/` ile çakışmaz).
- Worker, URL/method/body/query bilgilerini `https://fps.goog` hedefine yönlendirir; `X-Gtg-Tag-Id: GTM-W6NVSMNV` ve Cloudflare ziyaretçi konum başlıklarını iletir.
- **Worker HTML değiştirmez; GTM betiğini otomatik eklemez.**
- `SiteAnalyticsLoader`, yalnızca analitik izni verildikten sonra `/ilkgtm/healthy` adresini test eder. Yanıt `ok` ise `/ilkgtm/?id=GTM-W6NVSMNV` kaynağından yükler. Hazır değilse önceki `googletagmanager.com/gtm.js` kaynağına geri döner.
- İzin geri çekilirse sağlık kontrolü devam ediyor olsa bile yeni GTM betiği eklenmez.

## Uygulama sırası (kritik)

1. Kod PR'si başarıyla birleştirilmiş ve canlıda olmalı.
2. Cloudflare hesabında oturum açıkken **yalnızca Worker route** etkinleştirilir. Kullanıcının Mac terminali veya Cline'da proje kökünden:
   ```sh
   npx wrangler login
   npx wrangler deploy --config workers/ilkoku-gtm-gateway/wrangler.toml
   ```
   Tokenları, kullanıcı adı/şifreleri sohbete kopyalamayın.
3. Mevcut otomatik Gateway ON kalırken yeni bağımsız servis sınanır:
   ```sh
   curl --fail --silent --show-error https://ilkoku.com/ilkgtm/healthy
   curl --fail --silent --show-error 'https://ilkoku.com/ilkgtm/?validate_geo=healthy'
   ```
   İkisi de tam `ok` dönmeli. Beklenmedik 403/429/5xx durumunda ilerlemeyin.
4. **Yalnızca yeni yol hazırsa** Cloudflare panelinde alan adının *Google Tag Gateway* otomatik entegrasyonu kapatılır: `Turn on and configure Google tag gateway` → OFF. Bu, `Set up tag` seçeneğiyle aynı işlem değildir! DNS/Cloudflare proxy kapatılmayacak.
5. Yeni gizli pencerede sayfayı ziyaret edip **Tümünü reddet**: `/1q6z/`, `/ilkgtm/`, `gtm.js` measurement isteği görünmemeli; `analytics_storage=denied`.
6. Yeni gizli pencerede **Tümünü kabul et**: GTM yalnızca `/ilkgtm/?id=GTM-W6NVSMNV` üzerinden ve bir kez yüklenmeli. `analytics_storage=granted`. Google Tag Assistant **Hits Sent** panelinde gerçek GA4 etkinlikleri ve first-party yol görülmeli.
7. Son canlı audit `Live Google Tag Gateway and consent audit` çalıştırılır. Başarılı olmadan güvenlik sorunu kapatılmaz. Belirli olaylar: ilk sayfa görüntüleme, CTA/form, telefon/WhatsApp vb. sitede gerçekten kullanılan izleme olayları. Çift etkinlik veya eksik etkinlik olmamalı.

## Yanlış sonuca karşı güvenlik

- Otomatik Gateway kapatıldıktan sonra Worker çalışmazsa uygulama **yalnızca izin sonrasında** doğrudan Google GTM'ye geri döner. Ölçüm kesintisini önleyen geçici emniyet.
- Eski otomatik Gateway ON kaldığı sürece izin öncesi yükleme sorunu **devam eder**; sadece Worker eklemek tek başına çözüm değildir.
- `/1q6z/` ve `/ilkgtm/` aynı anda uygulama betiğine kaynak olarak eklenmemeli.
- Worker etkinleştirme yetkisi Cloudflare oturumu/API tokenı ister. Bu sohbetin mevcut bağlı araçları Cloudflare zone yazma yetkisi vermiyor. Otomatik entegrasyonu yetkisiz kapatmaya çalışmayın.
- `GTM-W6NVSMNV` dışındaki bağımsız GA4/Ads etiketleri için ayrı manuel endpoint gerekebilir. Kullanımdaki etiketler GTM konteynerinde birleştirilmeli veya ilgili kimlik için ayrı servis hazırlanmalıdır.

## Kaynaklar

- Google manuel gateway: https://developers.google.com/tag-platform/tag-manager/gateway/setup-guide?setup=manual
- Cloudflare Gateway scope: https://developers.cloudflare.com/google-tag-gateway/
- Google consent mode: https://developers.google.com/tag-platform/security/guides/consent
- Cloudflare Workers route: https://developers.cloudflare.com/workers/configuration/routing/routes/
