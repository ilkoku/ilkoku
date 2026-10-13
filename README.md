# EU

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
