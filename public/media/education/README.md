# İlkOku Eğitim Görsel Deposu

Bu klasör, GitHub içinde tutulan **tüm yeni Eğitim görsellerinin tek kanonik kaynağıdır**.

## Klasör standardı

```text
public/media/education/<kategori>/<tur>/
```

Örnek:

```text
public/media/education/kurgu/roman/
public/media/education/kurgu/oyku/
public/media/education/edebiyat/siir/
```

## 7 görsel slotu

Her tür için 7 ana slot kullanılır:

```text
01-hero
02-fikir-akisi
03-yapi-diyagrami
04-eser-anatomisi
05-sayfa-yazim-ayari
06-ornek-proje
07-final-cta
```

## Dosya adı standardı

Kullanıcıya teslim edilen ve tür klasöründe tutulan final görseller kategori + tür adıyla adlandırılır:

```text
<kategori>-<tur>-01-hero.png
<kategori>-<tur>-02-fikir-akisi.png
<kategori>-<tur>-03-yapi-diyagrami.png
<kategori>-<tur>-04-eser-anatomisi.png
<kategori>-<tur>-05-sayfa-ayari.png
<kategori>-<tur>-06-ornek-proje.png
<kategori>-<tur>-07-final-cta.png
```

Örnek — Öykü:

```text
kurgu-oyku-01-hero.png
kurgu-oyku-02-fikir-akisi.png
kurgu-oyku-03-yapi-diyagrami.png
kurgu-oyku-04-eser-anatomisi.png
kurgu-oyku-05-sayfa-ayari.png
kurgu-oyku-06-ornek-proje.png
kurgu-oyku-07-final-cta.png
```

## Depo ve kalite kuralı

- ChatGPT / geliştirme sürecinde üretilen **yeni statik Eğitim görselleri yalnız bu kök altında** tutulur.
- Eğitim görselleri başka `public/` klasörlerine dağıtılmaz.
- İçerik Yönetimi ekranından PC ile yüklenen canlı görseller GitHub'a yazılmaz; merkezi CMS `media` + `media_blob` deposunda saklanır.
- CMS medya kayıtlarının mantıksal klasörü aynı ağacı izler: `education/<kategori>/<tur>`.
- Public sayfalar görseli depodan referans eder; ayrı kopyalar oluşturmaz.
- Kaynak dosya yükleme sırasında yeniden boyutlandırılmaz, kırpılmaz, sıkıştırılmaz veya zorla büyütülmez.
- Slot otomasyonu hedef oranı ve `contain` yerleşimini metadata olarak uygular.
- Düşük çözünürlüklü bir kaynak görsel yapay upscale ile kabul edilebilir hale getirilmez; yeterli kaynak çözünürlüğü üretilir/kullanılır.

## İlkOku marka kullanımı — zorunlu

Eğitim görsellerinde ürün veya yazarlık çalışma ortamı görünüyorsa İlkOku kimliği kullanılmalıdır:

- **PC / laptop / masaüstü ekranında** uydurma bir yazarlık uygulaması, boş ekran veya başka marka kullanılmaz. Ekranda **İlkOku / ilkoku.com** ve mümkün olduğunda gerçek İlkOku yazar arayüzü gösterilir.
- **Antetli kağıt, belge, çıktı, çalışma sayfası, dosya veya doküman mockup'ında** uygun ve doğal bir yerde **İlkOku / ilkoku.com** kimliği bulunur.
- Ürün görünürken rakip marka, alakasız logo veya sahte üçüncü taraf yazarlık arayüzü kullanılmaz.
- İlkOku markası sahnenin ana eğitim içeriğini bastıracak kadar büyük veya dekoratif kullanılmaz; gerçek bir ürün/doküman kullanımı gibi görünmelidir.

## Görsel düzenleme disiplini — zorunlu

Mevcut bir görsel revize ediliyorsa **yeniden tasarım yapılmaz**. İstenen değişiklik alanı neyse müdahale yalnız o alanla sınırlıdır.

- Açıkça istenmeyen metinler, nesneler, ışık, renk tonu, kadraj, kompozisyon, karakterler ve arka plan korunur.
- “Şu butonu kaldır” talebi yalnız o butonun kaldırılmasıdır; başka metin veya tasarım öğesi değiştirilmez.
- Görsel içine, kullanıcı özellikle istemedikçe, gerçek bir web butonu gibi görünen **tıklanabilir CTA / “Yazmaya Başla” benzeri buton grafiği** gömülmez. CTA gerekiyorsa öncelik public sayfadaki gerçek HTML/CMS aksiyonudur.
- Var olan başarılı görselin tonu ve düzeni, yalnız yeni bir tasarım açıkça istenirse değiştirilir.

## Tür özgünlüğü — zorunlu

Ortak şablon sistemi içerik kopyalama anlamına gelmez.

- Her eser türünün eğitim mimarisi, başlıkları, örnekleri, diyagramları ve görselleri **türe özgü** hazırlanır.
- Roman başlıklarını Öykü'ye veya başka türe kopyalayıp yalnız tür adını/kelimeleri değiştirmek yasaktır.
- Ortak olan şey görsel sistem, 7 slot, kalite standardı ve CMS altyapısıdır; öğretim içeriği değildir.

## Sayfa tamamlama ve ZIP teslim standardı

Bir türün public eğitim sayfası tamamlandıktan ve teknik kontrolleri yapıldıktan sonra **7 final görsel tek ZIP içinde** kullanıcıya teslim edilir.

- ZIP içindeki görseller yukarıdaki kanonik dosya adlarını kullanır.
- ZIP, ara taslakları değil yalnız sayfada kullanılacak final 7 görseli içerir.
- Görseller doğru slota göre sıralanır; eksik/tekrarlı dosya bulunmaz.
- Sayfa bittikten sonra görsel değişikliği yapılırsa ZIP de final görsellerle yeniden oluşturulur.
- Teknik PASS, görsel HUMAN_PASS yerine geçmez; kullanıcı canlı sayfayı görsel olarak onaylamadan tür tasarımı nihai kabul edilmez.

## Slot ölçü standardı

| Slot | Önerilen ölçü | Oran | Yerleşim |
| --- | ---: | --- | --- |
| 01 Hero | 1600×900 | 16:9 | contain, crop yok |
| 02 Fikir Akışı | 1440×1080 | 4:3 | contain, crop yok |
| 03 Yapı Diyagramı | 1500×1000 | 3:2 | contain, crop yok |
| 04 Eser Anatomisi | 1500×1000 | 3:2 | contain, crop yok |
| 05 Sayfa ve Yazım Ayarı | 1500×1000 | 3:2 | contain, crop yok |
| 06 Örnek Proje | 1500×1000 | 3:2 | contain, crop yok |
| 07 Final CTA | 1500×1000 | 3:2 | contain, crop yok |

Bu tablo kod tarafında `src/lib/cms-education.ts` içindeki `EDUCATION_VISUAL_SLOTS` ile senkron tutulur.
