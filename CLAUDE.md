@AGENTS.md

# İlkOku: sayfa ve tasarım değişikliği kuralları

Bu bölüm, mevcut site tasarımını bozmadan düzenleme yapmak içindir. Amaç: tek seferde doğru yapmak, "bozup düzeltme" turlarını bitirmek.

## Temel ilke

Yeni tasarım üretme, mevcut tasarımı sürdür. Bir sayfada çalışırken o sayfanın bugünkü görünümü referanstır. Bozulan bir şeyi sonradan düzeltmektense, baştan bozmamak ucuzdur.

## Değişiklikten önce (zorunlu)

1. **Sayfanın bugünkü halini kaydet.** Dev sunucuda (`npm run dev`, port 3000) masaüstü ve 375px ekran görüntüsü al. Değişiklikten sonra aynı iki görüntüyle karşılaştır.
2. **CSS dosyasını kimin kullandığını bul.** Dosyada değişiklik yapmadan önce `grep -rn "<dosya-adi>.css" src` çalıştır. Birden fazla import varsa dosya paylaşılandır, kuralı o dosyaya ekleme.
   - Bilinen paylaşım: `src/app/yazarlar-icin/education-hub.css` hem `/yazarlar-icin` hem `/editorler-icin` sayfasında import edilir. Buradaki bir değişiklik iki sayfayı birden etkiler.
3. **Sınıf adını tüm projede ara.** Yeni sınıf yazmadan önce aynı işi yapan sınıf var mı bak (`grep -rn "sinif-adi" src`). Yeni sınıfı sayfaya özel bir önekle adlandır (örnek: `.writers-directory__*`), genel isim verme.
4. **Mevcut bileşeni kullan.** `src/components/content/` altında hazır bileşenler var (`ForWritersExperience`, `ForEditorsExperience`, `AllWritingGuidesDirectory`, `ContentShell` vb.). Önce bunları oku, sonra gerekirse genişlet. Bileşeni baştan yazma.
5. **Hangi testin o sayfayı kontrol ettiğini bul.** Sayfa adıyla `scripts/security-contract-*.test.mjs` ve `tests/browser/*.spec.mjs` dosyalarını ara. Bu testler SEO, iç bağlantı ve metin sözleşmelerini sabitler. Testin beklediği şeyi (link sayısı, sınıf adı, metin) kaldırmadan önce testi oku.

## Tasarım dili

- Renk, aralık, yarıçap ve gölge için `src/styles/tokens.css` içindeki değişkenleri kullan (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`). Sabit hex değeri yazma.
- Dikkat: `tokens.css` koyu tema varsayılanıdır. Yazar yüzeyleri ve bazı sayfalar açık lavanta zemin kullanır ve renkleri `src/styles/light-surface-unification.css` ile ezer. Bir sayfada koyu kartın üstüne koyu metin ya da beyaz zeminde beyaz metin çıkmasının sebebi genelde budur. Yeni kart stili yazmadan önce sayfanın zemin rengini tarayıcıda hesaplanmış stille (`getComputedStyle`) doğrula.
- Sabit header yüksekliği (public site) yaklaşık 161px. `scroll-margin-top`, sticky `top` gibi değerleri tahmin etme: tarayıcıda ölç, tek seferde yaz.
- Mobil kontrol genişliği: 375px. Yatay taşma (`scrollWidth > clientWidth`) olmamalı.
- Yeni `!important` ekleme. Zorunluysa nedenini CSS yorumuna yaz.

## Değişiklik sırasında

- Sadece istenen sayfa ve bölümü değiştir. İstenmeyen yeniden düzenleme, yeniden adlandırma, "temizlik" yapma.
- Paylaşılan dosyada değişiklik gerekiyorsa: sadece o sayfaya ait yeni kapsam sınıfı ekle, mevcut kuralları değiştirme.
- **CMS içeriğine (sayfa metinleri, başlıklar, düğme etiketleri) dokunma.** Metin tekrarı veya yazım düzeltmesi görürsen düzeltme, kullanıcıya bildir. Karar kullanıcıya aittir.
- Bir değişiklik 3 dosyadan fazlasına dokunuyorsa dur, planı kullanıcıya özetle.

## Değişiklikten sonra (zorunlu)

1. Aynı sayfanın masaüstü ve 375px ekran görüntüsünü al, önceki görüntüyle karşılaştır.
2. Değiştirilen CSS dosyasını import eden **tüm** sayfaları aç ve bak (örnek: `education-hub.css` için hem `/yazarlar-icin` hem `/editorler-icin`).
3. Konsolda hata olmadığını kontrol et.
4. İlgili testi çalıştır. Tüm `test:security` paketi çok uzundur, tamamını çalıştırma. Sadece sayfaya ait dosyaları çalıştır:
   ```bash
   node --test scripts/security-contract-for-writers.test.mjs scripts/security-contract-seo-indexing.test.mjs
   ```
5. Dosya bazlı lint:
   ```bash
   npx eslint <değişen-dosya>
   ```
6. İş bittiğinde ne doğrulandığını, neyin doğrulanmadığını açıkça yaz.

## Tek seferde doğru yapmak için

- Bilmediğin bir değeri tahmin edip deneme yanılma yapma. Önce ölç ya da oku.
- Bir düzeltme turu başarısız olursa dördüncü kez aynı yönde deneme. Dur, sebebi `getComputedStyle` ve ilgili CSS kuralının kaynağıyla bul, sonra tek düzeltme yap.
- Emin olmadığın tasarım kararında kullanıcıya sor. Bozup geri almak daha pahalıdır.

## Commit

- Commit'e sadece o göreve ait değişiklikleri koy. Çalışma ağacı çoğu zaman başka görevlerin değişikliklerini de içerir. `git add -p` ile hunk hunk seç, `git add .` kullanma.
- `AGENTS.md` içindeki `nextjs-agent-rules` bloğu `next dev` tarafından otomatik yazılır. Görevle ilgisi yoksa commit'e alma.
