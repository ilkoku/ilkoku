# İlkOku Sprint 2.3 / Faz 1

Bu paket güncel local projenin üzerine uygulanır.

## Kapsam
- Bölüm içindeki “Editöre Gönder” kaldırıldı.
- Editör talebi yalnızca yayımlanmış eser seviyesinde açılıyor.
- Yayımdaki eser editör talebi sırasında yayından düşmüyor.
- Editör değerlendirmesi bölüm seçmeden eser geneline kaydediliyor.
- Eski `in_review` kayıtları migration sırasında kaybolmadan yeni duruma aktarılıyor.

## Local uygulama
Paket içeriğini `/Users/eu/ilkoku-app` üzerine kopyaladıktan sonra:

```bash
cd /Users/eu/ilkoku-app
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm run dev
```

## GitHub
```bash
git add prisma src

git commit -m "feat(editor): move review flow to published work level"

git push origin main
```
