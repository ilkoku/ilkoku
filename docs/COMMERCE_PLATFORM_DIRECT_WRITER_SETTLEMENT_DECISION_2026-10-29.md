# İlkOku — Doğrudan satıcı ve yazar telif belgesi karar kaydı (29.10.2026)

## İş kararı
- Okura dijital eseri kendi adına **İlkOku satar**. Yeni eser/sipariş için hukukî satıcı `platform_direct` ve `LegalParty.kind=platform` olmalıdır.
- Yazarın ekonomik payı, ilgili eserin/siparişin dondurulmuş komisyon oranı **KDV hariç satış matrahından** düşüldükten sonra oluşur. Varsayılan oran %15'tir; yazara/esere özel oran önceliği korunur.
- Faturalı yazar, İlkOku'ya **komisyon sonrası telif bedelini** belgeye esas alır. İlkOku'nun doğrudan satıcı sıfatıyla içeride tuttuğu pay, ayrıca ve kendiliğinden yazara kesilen bir komisyon hizmet faturası **değildir**.
- Fatura düzenleme yükümlülüğü bulunmayan yazar fatura düzenlemez. Belge türü (uygunsa gider pusulası), stopaj, KDV ve %5 ek hizmet bedelinin sözleşmesel/vergi hukuku dayanağı mali müşavir tarafından incelenir. e-SMM yükümlülüğü olan yazar ayrı sınıflandırılır.
- İlkOku'da **fatura/gider pusulası kesme ekranı açılmaz**. Onaylı tutarlar ve referanslar yalnız haricî muhasebe yazılımına aktarım için hazırlanabilir.

## 100 TL KDV hariç örnek — yalnız ön hesap
- Okur satış matrahı 100 TL, ilk varsayımsal satış KDV'si %20 → okur toplamı 120 TL.
- %15 komisyon (İlkOku ekonomik payı) 15 TL; yazarın **komisyon sonrası telif matrahı 85 TL**.
- Faturalı yazar örneği: mükellefiyetine göre geçerli KDV oranının %20 olduğu varsayılırsa telif faturası 85 TL + 17 TL KDV = 102 TL. İlkOku'nun ayrıca 15+3 TL komisyon hizmet faturası düzenlediği varsayılmaz.
- Faturasız/uygun gider pusulası örneği: 85 TL telif matrahından vergi mevzuatına göre stopaj ve varsa ayrı %5 hizmet bedeli/KDV ön hesabı yapılabilir. Bu örnek gerçek banka talimatı değildir.

## Değişmeyen güvenlik sınırları
1. Platformun hukukî kimliği, vergi/adres bilgileri ve dijital eser satış hakkı **gerçek ve denetlenebilir belgelerle** doğrulanmadan yeni gerçek sipariş açılmaz.
2. `TEST209` promosyon erişimi, gerçek `ILK-...` siparişi, tahsilat, telif, komisyon veya stopaj değildir.
3. Gerçek sağlayıcı, kart/telefon tahsilatı ve muhasebeleştirme/ödeme emirleri bu kararla açılmaz.
4. Eski siparişlerin donmuş satıcı, fiyat ve komisyon snapshot'ları geriye dönük değiştirilmez.
5. `settlement-preview.ts` ve yazar/sipariş inceleme sayfaları **salt okunur** varsayımsal hesaptır. Mevcut gün sonu dış muhasebe ön hazırlık sütunları henüz onaylı fatura/vergi eşlemesi değildir; bu karar ile yeniden değerlendirilene kadar gerçek belge düzenleme kaynağı olarak kullanılamaz.

## Onay bekleyen dış muhasebe konuları
- Gerçek hukukî işletme unvanı, vergi tanımlayıcısı, tebligat adresi ve satış yetkisi dokümanı.
- Faturalı yazar için fatura / e-SMM statüsü, KDV uygulaması ve yazarın hangi telif/lisans hakkını devrettiği.
- Faturasız yazar için gider pusulası uygunluğu, uygulanacak stopaj ve KDV, ayrı %5 hizmet bedelinin nasıl belgelendirileceği.
- Sipariş, yazar belgesi ve gün sonu muhasebe dış aktarım alanlarının kesin hesap planı eşlemesi.

**Politika kararı belge veya mali müşavir onayı yerine geçmez.**
