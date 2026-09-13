# İlkOku — Yazarlık Eğitim Sistemi Devam Notu · 13.09.2026

## NE YAPIYORUZ?

İlkOku’da eser yazmak isteyen bir kişinin, seçtiği türe göre sıfırdan eserini kurup yazabilmesini öğreten profesyonel bir **Yazarlık Eğitim Sistemi** oluşturuyoruz.

Her eser türünün ayrı eğitim sayfası olacak. Ortak teknik altyapı kullanılacak; fakat Roman, Öykü, Novella, Fantastik, Bilim Kurgu, Distopya ve diğer türlerin her biri **kendi yazarlık mantığı, öğretim sırası, yapısı, örnek projesi ve görselleriyle ayrı bir eğitim** olacak.

## NEDEN YAPIYORUZ?

Amaç yalnız tür hakkında bilgi veren veya SEO için çoğaltılmış sayfalar üretmek değildir. Daha önce hiç eser yazmamış bir kişiyi **fikirden ilk tamamlanmış eserine** götürmek istiyoruz.

Kullanıcı İlkOku’ya geldiğinde “nasıl başlayacağım?” diye dışarıda eğitim aramasın. Türünü seçsin; fikrini kursun; karakterini, dünyasını veya türüne özgü yapısını geliştirsin; taslağını yazsın; revize etsin ve ardından İlkOku Yazar Alanı’nda gerçek eserini oluştursun.

Bu nedenle eğitim sistemi İlkOku’nun yazar üretim sürecinin giriş kapısıdır.

> **Biz 83 tane SEO sayfası yapmıyoruz. 83 farklı eser türünde, hiç yazmamış bir insanı yazara dönüştürecek İlkOku Yazarlık Okulu’nu kuruyoruz.**

Ana ürün sırası:

**İnsan → öğrenme → uygulama → eser → İlkOku Yazar Alanı**

Her tür için bitiş kontrol sorusu:

> **Bu sayfayı daha önce hiç eser yazmamış biri takip ettiğinde, dışarıdan başka eğitim aramadan bu türde kendi eserini kurup yazmaya başlayabilir mi?**

Cevap “evet” değilse, sayfa teknik olarak kusursuz olsa bile eğitim tamamlanmış sayılmaz.

---

## GÜNCEL İLERLEME

HUMAN_PASS alan türler, kanonik GENRES sırasıyla:

1. Roman ✅
2. Öykü ✅
3. Novella ✅
4. Fantastik ✅
5. Bilim Kurgu ✅

**Sıradaki tür: Distopya.**

Bilim Kurgu için:
- özgün eğitim mimarisi tamamlandı,
- örnek proje: **Derin Sessizlik**,
- ana karakter: **Ece Aydın**,
- PR #823 merge edildi,
- post-merge CI ve Production Smoke PASS,
- 7 final görsel hazırlandı ve kullanıcı tarafından onaylandı,
- kullanıcı 13.09.2026 tarihinde HUMAN_PASS verdi.

Bilim Kurgu HUMAN_PASS, `src/lib/writing-guide-progress.json` kanonik ilerleme kaydına işlenmelidir / bu devam notuyla aynı release akışında işlenmektedir.

---

# HER YENİ TÜRDE ZORUNLU ÇALIŞMA PROTOKOLÜ

## 1. Önce mevcut tür gerçekten kapanır

Yeni türe geçmeden önce mevcut türün:
- teknik CI / build / Production Smoke sonuçları,
- 7 görseli,
- canlı sayfası,
- kullanıcı kontrolü,
- HUMAN_PASS kaydı

tamamlanmış olmalıdır.

**Teknik PASS, HUMAN_PASS değildir.** HUMAN_PASS yalnız Ersin’in gerçek canlı kullanıcı kontrolü ve açık onayıyla verilir. HUMAN_PASS kanonik ilerleme dosyasına işlenmeden sonraki tür açılmaz.

## 2. Sıradaki tür ezberden seçilmez

Her defasında `src/lib/genres.ts` içindeki gerçek GENRES sırası doğrulanır. Sıradaki tür tahmin edilmez.

Mevcut doğrulanmış sıra başlangıcı:

**Roman → Öykü → Novella → Fantastik → Bilim Kurgu → Distopya → Ütopya → Polisiye → …**

## 3. Önce türün öğretim mantığı kurulur, sonra sayfa

Yeni türde önce şu soru cevaplanır:

**“Bu türü hayatında hiç yazmamış biri, sıfırdan nasıl öğrenip kendi eserini kurabilir?”**

Roman/Fantastik/Bilim Kurgu veya başka bir türün başlıklarını alıp kelime değiştirmek yasaktır.

Her türün:
- kendi başlangıç problemi,
- kendi fikir üretme yöntemi,
- kendi yapı mantığı,
- kendi karakter/dünya/sistem ihtiyacı,
- kendi taslak yöntemi,
- kendi revizyon kontrolü
olmalıdır.

83 eğitim demek, gerekirse 83 farklı öğretim sırası demektir.

## 4. Tek bir özgün örnek proje bütün eğitimi taşır

Her tür için yeni ve özgün bir örnek eser oluşturulur. Örnek proje dekor değildir; eğitim boyunca çalışan vaka dosyasıdır.

Karakter, dünya/sistem, çatışma, yapı, sahneler, taslak, revizyon ve görseller aynı örnek proje üzerinden birbirine bağlanır.

Fantastik örneği: **Kül Haritası / Mira**  
Bilim Kurgu örneği: **Derin Sessizlik / Ece Aydın**

Distopya için bunlardan bağımsız yeni bir örnek proje kurulacaktır.

## 5. GitHub release yöntemi değişmez

Her değişiklikte:

`main doğrula → branch → değişiklik → draft PR → final-head CI → Education Bombe Gate → build → ready → exact head SHA ile merge → main doğrula → post-merge CI + Production Smoke`

Kurallar:
- `main`e doğrudan push yapılmaz.
- PR head SHA değişirse eski başarılı CI geçerli sayılmaz.
- Merge yalnız son exact head doğrulandıktan sonra yapılır.
- CI genel kırmızıysa hangi adımın kırıldığı ayrıca açıklanır.
- Teknik release ile HUMAN_PASS birbirine karıştırılmaz.

## 6. 7 görsel slotu sabittir

Her türde tam olarak 7 ayrı final eğitim görseli vardır:

1. `hero`
2. `ideaFlow`
3. `structure`
4. `anatomy`
5. `pageSetup`
6. `project`
7. `finalCta`

Genel dosya adlandırması:

- `kurgu-<slug>-01-hero.png`
- `kurgu-<slug>-02-fikir-akisi.png`
- `kurgu-<slug>-03-yapi-diyagrami.png`
- `kurgu-<slug>-04-eser-anatomisi.png`
- `kurgu-<slug>-05-sayfa-ayari.png`
- `kurgu-<slug>-06-ornek-proje.png`
- `kurgu-<slug>-07-final-cta.png`

---

# GÖRSEL KİMLİK KİLİDİ

## Ana kural

> **STANDART DEĞİŞMEZ; YALNIZ KONU DEĞİŞİR.**

Roman, Novella, Fantastik ve Bilim Kurgu’da onaylanan İlkOku Yazarlık Okulu görsel dili yeni türlerde bozulmayacaktır.

Ortak kimlik:
- gerçekçi ve yüksek kaliteli editoryal sahne,
- sıcak ve profesyonel çalışma ortamı,
- doğal gün batımı / golden-hour ışığı,
- ahşap çalışma yüzeyleri,
- krem + kontrollü mor/lila + lacivert dengesi,
- gerçek çalışma materyalleri,
- corkboard / worksheet / kart / diyagram / laptop gibi eğitim araçları,
- modern ama soğuk olmayan,
- yaratıcı fakat reklam afişine dönüşmeyen,
- aynı Yazarlık Okulu ailesine ait olduğu ilk bakışta anlaşılabilen kompozisyon.

Yeni türde yalnız **eğitim konusu, proje içeriği, kartlar, semboller, çalışma materyalleri ve türün pedagojisi** değişir.

## Kesin görsel yasakları

- 7 görseli tek kolaj içinde üretmek YASAK.
- Bir kompozisyonu 7 kez tekrar edip yalnız yazıları değiştirmek YASAK.
- Tür değişti diye tüm İlkOku görsel kimliğini değiştirmek YASAK.
- Reklam posteri / kampanya afişi görünümü YASAK.
- Görsele gereksiz büyük pazarlama başlığı bindirmek YASAK.
- Sahte CTA butonu (`Eğitime Başla`, `Şimdi Yaz` vb.) üretmek YASAK.
- Kupa, kalem, kişisel defter, planner, kitap, çanta veya masa aksesuarına İlkOku markası basmak YASAK.
- Gereksiz uzun Türkçe metinleri görselin içine üretmek YASAK.
- Küçük ve okunamayacak karmaşık tablo / fake UI / rastgele kitap sırtı metinleri kullanmak YASAK.
- Kullanıcı küçük bir düzeltme istediğinde tüm kompozisyonu yeniden tasarlamak YASAK.

**Edit > redesign.** Küçük hata varsa yalnız hata düzeltilir.

## Marka kullanımı

İlkOku markası yalnız doğal ve kurumsal yüzeylerde kullanılabilir:
- laptop / bilgisayar / tablet ekranındaki gerçek İlkOku arayüzü,
- resmi İlkOku çalışma kâğıdı,
- resmi belge / antet,
- gerektiğinde doğal biçimde `ilkoku.com`.

“İlkOku ruhu” merchandising değildir.

## Görsel boyut standardı

- `01 Hero`: 16:9, minimum **1600×900**, tercih **1920×1080+**
- `02 Idea Flow`: 4:3, minimum **1440×1080**
- `03–07`: 3:2, minimum **1500×1000**, tercih **1536×1024+**

Kaynak görsel:
- kırpılmaz,
- zorla büyütülmez,
- yapay upscale yapılmaz,
- doğal oranı korunur,
- mümkünse kalite kaybı olmadan 3 MB altında tutulur.

## Görsel üretim sırası

Her tür için 7 ayrı eğitim materyali üretilir. Bunların görevi yalnız güzel görünmek değildir:

- **Hero:** türü ve İlkOku okul kimliğini ilk bakışta verir.
- **Idea Flow:** fikrin nasıl esere dönüştüğünü öğretir.
- **Structure:** türe özgü dramatik/yapısal akışı gösterir.
- **Anatomy:** eserin hangi parçalarının birlikte çalıştığını öğretir.
- **Page Setup:** yazarın pratik çalışma sistemini gösterir.
- **Project:** örnek projeyi somut vaka olarak gösterir.
- **Final CTA:** eğitimin sonunda yazmaya geçme hissini verir; sahte UI butonu olmak zorunda değildir.

## ZIP öncesi zorunlu preflight

Kontrol edilmeden ZIP verilmez:
- tam 7 dosya var mı,
- kanonik adlar doğru mu,
- gerçek piksel ölçüleri/oranları doğru mu,
- Türkçe karakter bozulması var mı,
- gereksiz logo var mı,
- kişisel eşyalarda yanlış marka var mı,
- laptopta İlkOku kimliği doğru mu,
- kompozisyonlar birbirinin kopyası mı,
- görsel gerçekten ilgili türe mi ait,
- dosya boyutları uygun mu,
- slot ve dosya adı eşleşiyor mu.

ZIP yalnız 7 final görseli içerir. Deneme görselleri, contact sheet, preflight dosyası veya eski varyantlar ZIP’e girmez.

Akış:

**Görsel üret → 7 ayrı final dosya → technical preflight → ZIP → Ersin indirir → İlkOku Medya Yönetimi/Eğitim slotlarına yükler → canlı sayfa kontrolü → HUMAN_PASS**

---

# EDUCATION BOMBE / SAPMA KURALI

Education Bombe Gate mevcut tür sırasını, route’u, `force-dynamic`, CMS bağlantısını, sol menüyü, 7 slotu, örnek projeyi, Ustalardan Öğren bölümünü, SSS’yi ve final CTA’yı doğrular.

Bilim Kurgu ile birlikte tireli slug’ların (`bilim-kurgu` vb.) release gate tarafından doğru okunması sağlandı. Sonraki tireli türler sessizce gate dışına düşemez.

Kullanıcı `CEZA: [hata]` dediğinde:
1. hatanın kök nedeni açıklanır,
2. kural güçlendirilir,
3. mümkünse regresyon gate’i eklenir,
4. ilgili canlı türler yeniden doğrulanır,
5. teknik PASS ile HUMAN_PASS ayrı tutulur.

Aynı sapma iki kez tekrarlanırsa sonraki türe geçmeden teknik kilit uygulanır.

---

# SIRADAKİ ÇALIŞMA — DİSTOPYA

Distopya’ya geçmeden önce Bilim Kurgu HUMAN_PASS kanonik ilerleme kaydına işlenmiş olmalıdır.

Distopya’da yapılacak ilk iş sayfa kodlamak veya görsel üretmek değildir. Önce **Distopya yazarlığının özgün eğitim mimarisi** kurulacaktır.

Başlangıç araştırma/tasarım eksenleri:
- baskıcı veya yönlendirici sistem nasıl kurulur,
- sistemden kim fayda sağlar, bedeli kim öder,
- yasak / gözetim / propaganda / kıtlık / puanlama / dil / hafıza / hareket özgürlüğü gibi kontrol mekanizmaları,
- yanlış düzenin insanlar için nasıl “normal” hâle geldiği,
- kahramanın yalnız mağdur değil sistemle hangi bağa veya çıkar ilişkisine sahip olduğu,
- ilk çatlak / ihlal,
- sistemin karşılığı,
- kişisel ve toplumsal bedel,
- bireysel kurtuluş ile düzenin değişmesi arasındaki fark,
- final seçiminin sistemin gerçek mantığını açığa çıkarması,
- “kötü devlet” klişesi yerine gündelik hayat, kurum, teşvik ve korku üzerinden inandırıcı baskı düzeni kurulması.

Muhtemel yapı omurgası tasarım sırasında test edilecek; hazır şablon olarak kabul edilmeyecektir. Örneğin:

**Normalleşmiş düzen → Çatlak → İhlal → Karşılık → Bedel → Seçim / Yeni düzen**

Distopya için yeni bir örnek proje ve yeni ana karakter oluşturulacak. `Kül Haritası` veya `Derin Sessizlik` yeniden kullanılmayacaktır.

---

## SON KİLİT

Ürün kararı:

> **83 URL tamamlamak hedef değildir. 83 türde gerçek bir yazarlık okulu tamamlamak hedeftir.**

Görsel kararı:

> **Standart değişmez; yalnız konu değişir.**

Release kararı:

> **Teknik PASS ≠ HUMAN_PASS. Kullanıcı görmeden ve onaylamadan tür kapanmaz.**
