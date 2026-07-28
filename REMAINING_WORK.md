# İlkOku — Kalan İşler

## Öncelik 1 — Local doğrulama

1. `npm ci`
2. `npx prisma generate`
3. `npm run lint`
4. `npm run build`
5. `/editor/yazarlar` ekranını aktif editör hesabıyla test etme
6. Arama, tür, şehir ve sayfalama testleri

## Öncelik 2 — İkinci editör iş akışı

- Birinci editör rapor tamamlandıktan sonra ikinci editör seçme ekranı.
- Genel havuza bırakma.
- Platformdaki belirli editöre gönderme.
- Üye olmayan editöre e-posta daveti.
- İkinci editörün görevi kabul etmesi.
- İkinci raporun taslak ve tamamlanma süreci.
- İki rapor tamamlandığında eser durumunun `completed` olması.
- Yazar ve editör bildirimleri.
- Migration'ın local test veritabanında doğrulanması.

## Öncelik 3 — Rol ve route denetimi

- Okur menüsündeki `Yakında` sayfaları.
- Yayınevi rolü ve panel izinleri.
- Admin route korumaları.
- Editör, yazar, okur ve yayınevi yönlendirmeleri.
- Çakışan veya eski route'ların temizlenmesi.

## Öncelik 4 — Eser yaşam döngüsü

- Yeni eser oluşturma.
- Bölüm yönetimi.
- Taslak, önizleme ve yayınlama.
- Editör incelemesine gönderme.
- Versiyon geçmişi.
- Sahiplik damgası.
- Özgünlük raporu için gerçek veri üretimi.

## Öncelik 5 — Ürün modülleri

- Okur bildirimleri ve profil ekranları.
- Okumaya devam et.
- Yayınevi eser takip ve başvuru akışı.
- Yazar-yayınevi iletişim kuralları.
- Bildirim ve e-posta şablonları.
- Yönetim raporları.

## Öncelik 6 — Final kalite

- Erişilebilirlik.
- Mobil/tablet kontrolleri.
- Empty/loading/error durumları.
- Güvenlik ve rol testleri.
- Veritabanı migration prova çalışması.
- CI kontrolü.
- Deployment öncesi final paket.
