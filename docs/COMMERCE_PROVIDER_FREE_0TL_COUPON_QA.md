# İlkOku — Ücretli Bölüm Kilidi ve 0 TL Kupon Akışı

## Kabul kuralları

1. Satış modeli `paid` ve durumu `ready` veya `active` olan eserlerin `locked` bölümleri, satış sağlayıcısı/sözleşme/satıcı hazır olmasa da içerik sızdırmaz. `preview` bölümleri açık kalır.
2. Daha önce aktif edilmiş ücretli eser, duraklatıldığında veya düzenlendiğinde son onaylı erişim planını kullanır. Ücretsiz eserler ve yalnızca `draft` ücretli planlar önceki davranışını korur.
3. Kilitli bölüm seçildiğinde `/satinal/<eser>` gösterilir. Satışa izin verilmiyorsa nedeni açıklanır; sipariş verilmez.
4. Yazarın `/satis-erisim/kuponlar` ve yöneticinin `/sistem-yonetimi/odeme-sistemi/kuponlar` ekranları mevcut sistemde kalır.
5. Okur satın alma sayfasında pozitif fiyatlı eser için kupon uygular. Son fiyat **tam olarak 0 TL** ise, aktif sözleşme, onaylı hukukî satıcı ve eser satış yetkisiyle harici sağlayıcı kullanılmadan 0 TL sipariş oluşturulur.
6. Kısmi indirim sonrası **0 TL üzerindeki kalan tutar** için gerçek ödeme yöntemleri pasif kalır ve okuma hakkı verilmez.
7. Sipariş işleminde `Order`, `OrderLegalSnapshot`, `OrderConsent`, `CouponRedemption`, `WorkEntitlement`, `FinancialLedger` birlikte kaydedilir. `Payment` satırı oluşturulmaz.
8. `sale_gross` orijinal tutarı, `platform_coupon_discount` veya `author_coupon_discount` indirimi ayrı kaydeder. Platform indirimi yazarın hakediş matrahını düşürmez. **Bu bir banka tahsilatı değildir.**

## Test kanıtı

Geçici CI Playwright ortamında 100 TL fiyatlı eser, 100% platform kuponu ve iki bölüm (ön izleme + kilitli) kullanılır. Kupon uygulanmadan 2. bölüm okunamaz; kupon sonrası 0 TL sipariş, tekrar okuma ve finans kayıtları doğrulanır. Gerçek hukukî satıcı yerine yalnızca CI'da izole sentetik kimlik vardır; canlıya yazılmaz.

## Canlı aktivasyon engelleri

Canlı okuyucu sözleşmesi gerçek son metinle onaylanıp aktive edilmeden ve eser satıcısı/yetki belgesi doğrulanmadan sipariş açılamaz. **Yalnızca “ilkoku” görünen adının kullanılması resmî taraf doğrulaması yerine geçmez.** Bu engelleri kaldırmak için sahte onay, sahte vergi bilgisi veya sahte hukukî kayıt oluşturulmaz.

## Sınırlar

`COMMERCE_CHECKOUT_ENABLED` ve ödeme sağlayıcısı kontrolleri, yalnız pozitif kalan tutarlı gerçek tahsilat yoluna uygulanır. Hiçbir kart veya telefon faturası tahsilatı yapılmaz.
