# İlkOku Eğitim Görsel Standardı

Bu belge, İlkOku Eğitim görsellerinin üretim, marka kullanımı, medya yönetimi, kalite ve teslim kurallarını tanımlar.

## Kanonik canlı medya kuralı — zorunlu

İlkOku artık tek tek sayfalara dosya gömülen bağımsız ekranlar değil, **merkezi CMS + Medya Yönetimi ile çalışan tek bir ürün bütünüdür**.

- Yeni bir içerik/eğitim görseli gerekiyorsa varsayılan akış: **görsel hazırlanır → Medya Yönetimi'ne yüklenir → ilgili sayfa/slot medyayı merkezi kaynaktan seçer → public sayfa bu kaynağı kullanır**.
- İçerik görselleri sayfa koduna rastgele dosya yolu yazılarak bağlanmaz.
- Aynı görselin sayfa bazlı kopyaları oluşturulmaz; merkezi medya kaydı yeniden kullanılır.
- CMS üzerinden PC ile yüklenen canlı görseller `media` + `media_blob` deposunda saklanır ve mantıksal klasörü `education/<kategori>/<tur>` ağacını izler.
- `public/media/education/` yalnız açıkça kodla deploy edilmesi gereken statik sistem/geliştirme varlıkları için kullanılır. **Canlı içerik görsellerinde öncelik Medya Yönetimi'dir.**
- Teknik olarak kodla deploy edilmesi gereken gerçek sistem asset'leri bu kuralın istisnasıdır; editoryal/eğitim görselleri değildir.

## Klasör standardı

Kodla deploy edilmesi açıkça gereken Eğitim asset'lerinde:

```text
public/media/education/<kategori>/<tur>/
```

Örnek:

```text
public/media/education/kurgu/roman/
public/media/education/kurgu/oyku/
public/media/education/edebiyat/siir/
```

CMS mantıksal klasörü:

```text
education/<kategori>/<tur>
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

Kullanıcıya teslim edilen final görseller kategori + tür adıyla adlandırılır:

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

- Public sayfalar merkezi medya kaydını referans eder; gereksiz ayrı kopyalar oluşturmaz.
- Kaynak dosya yükleme sırasında yeniden boyutlandırılmaz, kırpılmaz, sıkıştırılmaz veya zorla büyütülmez.
- Slot otomasyonu hedef oranı ve `contain` yerleşimini metadata olarak uygular.
- Düşük çözünürlüklü kaynak görsel yapay upscale ile kabul edilebilir hale getirilmez; yeterli kaynak çözünürlüğü üretilir/kullanılır.
- Görselin orijinal byte'ı ve mümkün olan en yüksek doğal kalite korunur.

## İlkOku görsel ruhu ve renk dengesi — zorunlu

Yeni görseller tek başına güzel görünmek için değil, **İlkOku sitesinin bütününe aitmiş gibi görünmek** için hazırlanır.

- Görselin ışık, boşluk, tipografi hissi, kontrastı ve genel atmosferi İlkOku'nun mevcut public tasarım diliyle uyumlu olmalıdır.
- İlkOku'nun lacivert / mor-lila vurgu ailesi gerektiğinde **ölçülü ve doğal** biçimde kullanılabilir; her obje marka rengine boyanmaz.
- Amaç marka hissini korumaktır; sahneyi reklam afişine veya kurumsal promosyon çekimine dönüştürmek değildir.
- Bir tür için hazırlanan 7 görsel kendi içinde aynı görsel aileye ait görünmeli, fakat sayfanın genel tasarımını bastırmamalıdır.
- Yeni bir görsel eklenirken yalnız o görsele değil, bulunduğu sayfanın tamamına ve sitenin genel bütünlüğüne bakılır.

## İlkOku marka kullanımı — zorunlu

İlkOku markası **ürün/doküman yüzeylerinde** görünür; yazarın kişisel eşyaları markalı promosyon ürünlerine dönüştürülmez.

### Markanın kullanılacağı yerler

- **PC / laptop / tablet ekranı:** boş, uydurma veya başka marka bir yazarlık uygulaması kullanılmaz. Ekranda **İlkOku / ilkoku.com** ve mümkün olduğunda gerçek İlkOku yazar arayüzü gösterilir.
- **Antetli kağıt, resmi çalışma sayfası, çıktı, belge veya doküman mockup'ı:** uygun ve doğal bir yerde **İlkOku / ilkoku.com** kimliği kullanılabilir.
- Ürün görünürken rakip marka, alakasız logo veya sahte üçüncü taraf yazarlık arayüzü kullanılmaz.

### Markanın varsayılan olarak kullanılmayacağı yerler

Aşağıdaki kişisel objeler **İlkOku merch ürünü gibi markalanmaz**:

- kupa / bardak,
- kalem,
- ajanda,
- kişisel defter,
- kitap ayracı,
- kalemlik,
- masa aksesuarları,
- kişisel dekor objeleri.

Bu objeler nötr veya kişisel görünür. Yazar kendi çalışma alanını kendi eşyalarıyla kurar; İlkOku bu eşyaları kullanıcıya veren bir fiziksel ürün markası gibi gösterilmez.

İlkOku logosu veya adı sahnenin ana eğitim içeriğini bastıracak kadar büyük/dekoratif kullanılmaz; gerçek bir dijital ürün veya doküman kullanımı gibi görünmelidir.

## Görsel düzenleme disiplini — zorunlu

Mevcut bir görsel revize ediliyorsa **yeniden tasarım yapılmaz**. İstenen değişiklik alanı neyse müdahale yalnız o alanla sınırlıdır.

- Açıkça istenmeyen metinler, nesneler, ışık, renk tonu, kadraj, kompozisyon, karakterler ve arka plan korunur.
- “Şu butonu kaldır” talebi yalnız o butonun kaldırılmasıdır; başka metin veya tasarım öğesi değiştirilmez.
- Görsel içine, kullanıcı özellikle istemedikçe, gerçek bir web butonu gibi görünen **tıklanabilir CTA / “Yazmaya Başla” benzeri buton grafiği** gömülmez. CTA gerekiyorsa öncelik public sayfadaki gerçek HTML/CMS aksiyonudur.
- Var olan başarılı görselin tonu ve düzeni, yalnız yeni bir tasarım açıkça istenirse değiştirilir.
- Küçük bir düzeltme yapılırken sayfanın veya görsel ailesinin bütünü bozulmaz.

## Tür özgünlüğü — zorunlu

Ortak şablon sistemi içerik kopyalama anlamına gelmez.

- Her eser türünün eğitim mimarisi, başlıkları, örnekleri, diyagramları ve görselleri **türe özgü** hazırlanır.
- Roman başlıklarını Öykü'ye veya başka türe kopyalayıp yalnız tür adını/kelimeleri değiştirmek yasaktır.
- Ortak olan şey görsel sistem, 7 slot, kalite standardı ve CMS altyapısıdır; öğretim içeriği değildir.

## Sayfa tamamlama ve ZIP teslim standardı

Bir türün public eğitim sayfası tamamlandıktan ve teknik kontrolleri yapıldıktan sonra **7 final görsel tek ZIP içinde** kullanıcıya teslim edilir.

- ZIP içindeki görseller yukarıdaki kanonik dosya adlarını kullanır.
- ZIP, ara taslakları değil yalnız sayfada kullanılacak final 7 görseli içerir.
- Görseller doğru slota göre sıralanır; eksik veya tekrarlı dosya bulunmaz.
- Sayfa bittikten sonra görsel değişikliği yapılırsa ZIP de final görsellerle yeniden oluşturulur.
- ZIP kullanıcıya **tıklanabilir indirme bağlantısı** olarak verilir; yalnız sunucu içi `/mnt/data/...` yolu gösterilmez.
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
