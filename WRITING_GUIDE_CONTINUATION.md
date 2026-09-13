# İlkOku — Yazarlık Eğitim Sistemi Devam Notu · 13.09.2026

## NE YAPIYORUZ?

İlkOku’da eser yazmak isteyen bir kişinin, seçtiği türe göre sıfırdan eserini kurup yazabilmesini öğreten profesyonel bir **Yazarlık Eğitim Sistemi** kuruyoruz.

Her eser türünün ayrı eğitim sayfası olacak. Ortak teknik altyapı kullanılabilir; fakat Roman, Öykü, Novella, Fantastik, Bilim Kurgu, Distopya ve devamındaki her tür **kendi yazarlık mantığı, pedagojisi, örnek projesi, revizyon yöntemi ve türe özgü görselleriyle ayrı eğitimdir.**

> **Biz 83 tane SEO sayfası yapmıyoruz. 83 farklı eser türünde, hiç yazmamış bir insanı yazara dönüştürecek İlkOku Yazarlık Okulu’nu kuruyoruz.**

Ana ürün sırası:

**İnsan → öğrenme → uygulama → eser → İlkOku Yazar Alanı**

Her tür için bitiş sorusu:

> **Bu sayfayı daha önce hiç eser yazmamış biri takip ettiğinde, dışarıdan başka eğitim aramadan bu türde kendi eserini kurup yazmaya başlayabilir mi?**

Cevap “evet” değilse eğitim tamamlanmış değildir.

---

# GÜNCEL DURUM

Kanonik GENRES sırasındaki HUMAN_PASS türleri:

1. Roman ✅
2. Öykü ✅
3. Novella ✅
4. Fantastik ✅
5. Bilim Kurgu ✅

Bilim Kurgu örnek proje: **Derin Sessizlik / Ece Aydın**.

Distopya teknik olarak hazırlanıp merge edildi. Örnek proje: **Denge Hattı / Derya Koral**. Distopya’nın 7 görseli ve HUMAN_PASS’i daha sonra yapılacak.

Kurgu kategorisinde toplam **25 tür** vardır.

---

# 13.09.2026 YENİ ÇALIŞMA KARARI — KURGU BATCH MODU

Ersin’in kararı:

> **Görseller zaman kaybettiriyor. Önce kalan Kurgu tür sayfalarını teknik ve içerik olarak hazırlayacağız. Görsellere ve HUMAN_PASS kontrollerine daha sonra Distopya’dan başlayarak geri döneceğiz.**

Bu karar, önceki “bir tür HUMAN_PASS olmadan sonraki teknik tür açılmaz” kilidini **teknik sayfa üretimi için geçici olarak değiştirir.**

Yeni ayrım:

### Teknik hazırlık
Birden fazla Kurgu türü GENRES sırasıyla hazırlanabilir, CI/gate/build kontrolünden geçebilir ve teknik olarak canlı olabilir.

### HUMAN_PASS
Hâlâ sırayla ve yalnız gerçek kullanıcı kontrolüyle verilir. Teknik batch hazırlığı hiçbir türe otomatik HUMAN_PASS vermez.

### Görsel kuyruğu
Kurgu sayfaları tamamlandıktan sonra görsel/HUMAN_PASS kuyruğu **Distopya’dan** devam eder.

Education Bombe bu nedenle güncellendi:
- teknik canlı türler yine GENRES kanonik prefix sırasını izlemek zorunda,
- HUMAN_PASS listesi yine GENRES kanonik prefix sırasını izlemek zorunda,
- teknik batch sayısı HUMAN_PASS+1 ile sınırlı değil,
- teknik kalite kontrolleri gevşetilmedi,
- HUMAN_PASS otomatikleşmedi.

---

# 13.09.2026 ROMAN-PARITY PEDAGOJİ KİLİDİ

Roman referans sayfası ile kalan Kurgu eğitimleri görsel hariç karşılaştırıldı. Teknik route ve 7 slot bulunması artık eğitim tamlığı için yeterli sayılmayacak.

Özellikle batch türlerde aşağıdaki eğitim halkaları zorunludur:

1. **Türe özgü fikir kaynakları** — öğrenci ilham beklemek yerine o türün motorundan fikir üretebilmeli.
2. **Komşu türlerden farkı** — öğrenci yazdığı eserin neden bu tür olduğunu anlayabilmeli.
3. **Fikirden bitmiş taslağa tam yazım rotası** — çekirdek → plan → sahne → ilk taslak → revizyon → bitmiş eser.
4. **Görselden bağımsız yazım / çalışma düzeni** — `pageSetup` görseli olmasa bile hangi dosya, tablo, çizelge veya kayıtların tutulacağı metinle öğretilmeli.
5. **İlk taslak yöntemi** — ilk taslakta neye öncelik verileceği, neyin erteleneceği ve taslağın ne zaman “bittiği” açık olmalı.
6. **Yayıma / paylaşmaya hazırlık** — türe özgü son kontrol, biçim/süreklilik ve ilk okur testi yapılmalı.
7. **Şimdi sen yap / uygulama çıktıları** — öğrenci sayfayı yalnız okumamalı; en az çekirdek, plan, ilk sahne ve revizyon notu üretmeli.

Ana pedagojik kural:

> **Bilgi veren sayfa yetmez; öğrenci sayfadan somut bir eser parçası üreterek çıkmalı.**

Batch Kurgu sayfalarında bu katman `src/lib/fiction-guide-pedagogy-parity.ts` üzerinden türe özgü olarak tanımlanır ve `BatchedFictionGuidePage` içinde gerçek eğitim bloklarına dönüşür.

Education Bombe, batch sayfalarda şu marker’ları ayrıca doğrular:
- `fikir-kaynaklari`
- `tur-farki`
- `tam-yazim-rotasi`
- `yazim-duzeni`
- `ilk-taslak`
- `yayina-hazirlik`
- `uygulama-ciktisi`

Bu katman tür adını değiştirerek aynı metni tekrar etmek için kullanılamaz. Her türün fikir motoru, plan odağı, sahne motoru, ilk taslak disiplini, çalışma dosyaları ve final kontrolü türe özgü olmalıdır.

---

# KURGU KANONİK SIRASI

1. Roman ✅ HUMAN_PASS
2. Öykü ✅ HUMAN_PASS
3. Novella ✅ HUMAN_PASS
4. Fantastik ✅ HUMAN_PASS
5. Bilim Kurgu ✅ HUMAN_PASS
6. Distopya — teknik hazır, görsel/HUMAN_PASS bekliyor
7. Ütopya
8. Polisiye
9. Dedektif
10. Gerilim
11. Korku
12. Macera
13. Aksiyon
14. Casusluk
15. Tarihî Roman
16. Psikolojik Roman
17. Romantik
18. Dram
19. Mizah
20. Hiciv (Satir)
21. Alternatif Tarih
22. Gotik
23. Mitoloji
24. Paranormal
25. Post-Apokaliptik

Batch hedefi: **6–25 arasındaki tüm Kurgu teknik eğitimlerini hazırlamak; görselleri daha sonra sırayla tamamlamak.**

---

# ORTAK TEKNİK ALTYAPI / AYRI EĞİTİM MİMARİSİ

Kural:

**1 ortak teknik sistem + her tür için ayrı eğitim mantığı.**

Ortak renderer / component / CSS kullanmak serbesttir ve tercih edilir. Bu teknik tekrarları azaltır.

Fakat içerik tarafında şu yasaklar geçerlidir:
- Roman metnini alıp tür adını değiştirmek YASAK.
- Bilim Kurgu veya Distopya başlıklarını kopyalayıp birkaç kelime değiştirmek YASAK.
- Aynı örnek projeyi farklı türlerde yeniden kullanmak YASAK.
- Türe özgü olmayan genel “fikir → karakter → taslak” metniyle sayfayı doldurmak YASAK.

Her türün en az şu parçaları özgün olmalıdır:
- başlangıç problemi,
- fikir üretme yöntemi,
- türe özgü yapı,
- eser anatomisi,
- pratik çalışma sistemi,
- karakter/dünya/sistem odağı,
- revizyon kontrolü,
- tek ve özgün örnek proje,
- örnek sahne,
- ustalardan öğren bölümü,
- SSS,
- final yazma çağrısı.

---

# KALAN KURGU ÖRNEK PROJELERİ

Teknik batch içinde kullanılan özgün vaka projeleri:

- Ütopya → **Ortak Bahçe**
- Polisiye → **Kırık Saat**
- Dedektif → **Sessiz Kat**
- Gerilim → **Son Sinyal**
- Korku → **Duvarın Ardındaki Ses**
- Macera → **Kayıp Meridyen**
- Aksiyon → **Sekiz Dakika**
- Casusluk → **Çifte Gölge**
- Tarihî Roman → **Kül ve Mühür**
- Psikolojik Roman → **İç Oda**
- Romantik → **İkinci Yaz**
- Dram → **Son Vardiya**
- Mizah → **Yanlış Toplantı**
- Hiciv → **Mükemmel Vatandaşlık Ofisi**
- Alternatif Tarih → **Gökyüzü Yarışı**
- Gotik → **Gölgeli Konak**
- Mitoloji → **Narın Yedinci Tohumu**
- Paranormal → **Üçüncü Kapı**
- Post-Apokaliptik → **Son Su Hattı**

Bu projeler eğitim vakasıdır; dekor veya yalnız SEO örneği değildir.

---

# ZORUNLU SAYFA TEKNİKLERİ

Her teknik canlı eğitim sayfasında:
- `force-dynamic`,
- CMS eğitim kaydı,
- doğru `activeGenreSlug`,
- GENRES sırasına uygun canlı sol menü route’u,
- örnek proje,
- Ustalardan öğren,
- SSS,
- gerçek final CTA,
- 7 CMS görsel slotu
bulunmalıdır.

7 sabit slot:
1. `hero`
2. `ideaFlow`
3. `structure`
4. `anatomy`
5. `pageSetup`
6. `project`
7. `finalCta`

Sayfa teknik olarak hazırlanırken görsel URL’leri boş olabilir; daha sonra Medya Yönetimi üzerinden bağlanacaktır.

---

# GITHUB RELEASE AKIŞI

Her batch değişikliğinde de yöntem değişmez:

`main doğrula → branch → değişiklik → draft PR → final-head CI → Education Bombe Gate → build → ready → exact head SHA merge → main doğrula → post-merge CI + Production Smoke`

- `main`e doğrudan push yok.
- Head değişirse eski CI sonucu geçersiz.
- Teknik PASS ile HUMAN_PASS aynı şey değildir.
- Batch PR büyük olsa bile CI/gate/build başarısızsa merge yok.

---

# GÖRSELLERE DÖNDÜĞÜMÜZDE KİLİTLİ STANDART

Ana kural:

> **STANDART DEĞİŞMEZ; YALNIZ KONU DEĞİŞİR.**

Roman / Öykü / Novella / Fantastik / Bilim Kurgu’da onaylanan İlkOku Yazarlık Okulu görsel kimliği korunacaktır:
- gerçekçi, editoryal, profesyonel,
- sıcak golden-hour ışığı,
- ahşap/krem + kontrollü mor/lila/lacivert,
- gerçek çalışma materyalleri,
- laptopta doğal İlkOku kullanımı,
- corkboard / kart / worksheet / diyagram dili,
- reklam afişi olmayan kompozisyon.

Kesin yasaklar:
- 7’li kolaj yok,
- tek görseli 7 kez tekrar yok,
- sahte CTA butonu yok,
- gereksiz büyük pazarlama başlığı yok,
- kupa/kalem/kişisel defter/çanta üzerinde İlkOku markası yok,
- uzun bozuk Türkçe metin yok,
- küçük düzeltmede tüm kompozisyonu yeniden tasarlamak yok.

**Edit > redesign.**

Boyutlar:
- 01 Hero → 16:9, min 1600×900, tercih 1920×1080+
- 02 Idea Flow → 4:3, min 1440×1080
- 03–07 → 3:2, min 1500×1000, tercih 1536×1024+

Dosya adları:
- `kurgu-<slug>-01-hero.png`
- `kurgu-<slug>-02-fikir-akisi.png`
- `kurgu-<slug>-03-yapi-diyagrami.png`
- `kurgu-<slug>-04-eser-anatomisi.png`
- `kurgu-<slug>-05-sayfa-ayari.png`
- `kurgu-<slug>-06-ornek-proje.png`
- `kurgu-<slug>-07-final-cta.png`

Görsel akışı:

**7 ayrı final görsel → preflight → ZIP → Medya Yönetimi → canlı sayfa → Ersin kontrolü → HUMAN_PASS**

HUMAN_PASS sırası Distopya’dan devam eder.

---

# SON KONTROL CÜMLELERİ

Ürün:

> **83 SEO sayfası değil, 83 ayrı yazarlık eğitimi.**

Pedagoji:

> **Bilgi → uygulama → somut eser çıktısı.**

Görsel:

> **Standart değişmez; yalnız konu değişir.**

Kalite:

> **Teknik PASS, HUMAN_PASS değildir.**
