# İlkOku — Build Raporu

Tarih: 27 Temmuz 2026

## Yapılan kontroller

### Kaynak sözdizimi

- Kontrol edilen TypeScript/TSX dosyası: 232
- Sözdizimi hatası: 0
- Sonuç: PASS

### Bağımlılık kurulumu

Komut:

```bash
npm ci
```

Sonuç: Bu çalışma ortamında tamamlanamadı.

Neden: NPM paket geçidi/önbelleğinde `zod-validation-error-4.0.2.tgz` paketi bulunamadı ve dış paket indirme erişimi sağlanamadı.

### Lint

Çalıştırılamadı; bağımlılıklar kurulamadı.

### Next.js build

Çalıştırılamadı; bağımlılıklar kurulamadı.

## Local makinede çalıştırılacak doğrulama

```bash
cd /Users/eu/ilkoku-app
npm ci
npx prisma generate
npm run lint
npm run build
```

Tam build sonucu görülmeden proje ilerleme yüzdesi artırılmamalıdır.
