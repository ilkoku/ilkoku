# ADR-0007: İlkOku Editör Akışı (LOCKED)

## Durum

Kabul edildi ve ürün kararı olarak kilitlendi.

## Değişmez Akış

1. Yazar eseri yayınlar.
2. Yayınlanan eser Genel Editör Havuzu'na düşer.
3. İlk alan platform editörü görevi atomik olarak kilitler ve 1. editör olur.
4. 1. editör bağımsız incelemesini tamamlar.
5. 1. editör eseri 2. editöre gönderir.
6. 2. editör platform havuzundan, belirli bir platform editörü olarak veya e-posta davetiyle atanır.
7. 2. editör bağımsız incelemesini tamamlar.
8. İki inceleme tamamlandığında sistem tek sonuç üretir ve yazara iletir.

## Kesin Kurallar

- Yazar editör seçmez.
- Yazar editöre göndermez.
- Yazar yalnızca eserini yayınlar.
- Genel Editör Havuzu ilk editör için tek giriş noktasıdır.
- İlk editör görevi atomik biçimde sahiplenir; aynı görevi başka editör alamaz.
- 1. ve 2. editör incelemeleri ayrı kayıtlardır.
- 2. editör daveti yalnızca 1. editör tarafından başlatılır.
- E-posta daveti üyeye veya üye olmayan kişiye gönderilebilir.
- Üye olmayan davetli kayıt olduğunda görev otomatik hesabına atanır.
- Davet süreci izlenebilir: gönderildi, mail açıldı, hesap oluşturuldu, kabul edildi, inceleme başladı, devam ediyor, tamamlandı.
- Ek davet durumları: reddedildi, iptal edildi, süresi doldu, yeniden gönderildi.
- İlk editör değerlendirmesinin ikinci editöre gösterilip gösterilmeyeceği ayrı ürün kararı verilene kadar kapalı tutulur.

## Editör Menüsü

### Keşif

- Eser Keşfet
- Yazar Keşfet
- Favorilerim
- Editör Seçkilerim

### Çalışma Alanı

- Genel Editör Havuzu
- 1. Editör İncelemelerim
- 2. Editör İncelemelerim
- Tamamlanan İncelemeler
- Bildirimler
- Profilim

## Teknik Sonuç

Mevcut `Work.assignedEditorId` alanı iki aşamalı akışı tek başına temsil edemez. Yeni yapı ayrı görev, atama, inceleme, davet ve davet olay kayıtları kullanacaktır.
