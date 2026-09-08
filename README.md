# İlkOku

İlkOku, yazarların eserlerini bölüm bölüm geliştirebildiği; okur geri bildirimi, profesyonel editör incelemesi ve yayınevi keşfini aynı platformda buluşturan dijital yazar ekosistemidir.

**Canlı site:** [https://ilkoku.com/](https://ilkoku.com/)

## Public surfaces

- [Nasıl Çalışır?](https://ilkoku.com/nasil-calisir)
- [Hakkımızda](https://ilkoku.com/hakkimizda)
- [Yazarlar İçin](https://ilkoku.com/yazarlar-icin)
- [Editörler İçin](https://ilkoku.com/editorler-icin)
- [Yayınevleri İçin](https://ilkoku.com/yayinevleri-icin)
- [Editoryal Standartlar](https://ilkoku.com/editoryal-standartlar)
- [Yardım Merkezi](https://ilkoku.com/yardim)

## Teknoloji

- Next.js 16
- TypeScript
- Tailwind CSS
- Prisma

## Local development

```bash
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

Temel doğrulamalar:

```bash
npm run lint
npm run build
```

## Katkı ve release akışı

Değişiklikler doğrudan `main` üzerine gönderilmez. Çalışma akışı:

`main doğrula → branch → değişiklik → draft PR → final-head CI / smoke → ready → exact head SHA ile merge → main doğrula`

Gerçek kullanıcı doğrulaması gerektiren kontroller otomatik testlerden ayrı tutulur.
