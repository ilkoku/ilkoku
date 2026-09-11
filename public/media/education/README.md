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

## Dosya standardı

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

Önerilen adlandırma:

```text
<tur>-01-hero.webp
<tur>-02-fikir-akisi.png
...
<tur>-07-final-cta.png
```

## Depo kuralı

- ChatGPT / geliştirme sürecinde üretilen **yeni statik Eğitim görselleri yalnız bu kök altında** tutulur.
- Eğitim görselleri başka `public/` klasörlerine dağıtılmaz.
- İçerik Yönetimi ekranından PC ile yüklenen canlı görseller GitHub'a yazılmaz; merkezi CMS `media` + `media_blob` deposunda saklanır.
- CMS medya kayıtlarının mantıksal klasörü aynı ağacı izler: `education/<kategori>/<tur>`.
- Public sayfalar görseli depodan referans eder; ayrı kopyalar oluşturmaz.
- Kaynak dosya yükleme sırasında yeniden boyutlandırılmaz veya kırpılmaz. Slot otomasyonu hedef oranı ve `contain` yerleşimini metadata olarak uygular.

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
