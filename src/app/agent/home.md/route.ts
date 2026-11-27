import { publicBrandDescription } from "@/lib/public-brand";

const markdown = `# İlkOku | Dijital Yazar Platformu

${publicBrandDescription}.

İlkOku, bir eserin yazım, gelişim, editoryal değerlendirme ve yayınevi keşfi yolculuğunu destekler.

## Kimler için?

- [Yazarlar için](https://ilkoku.com/yazarlar-icin): Eser yazma ve yayımlama rehberleri.
- [Okurlar için](https://ilkoku.com/okurlar-icin): Okuma rehberleri.
- [Editörler için](https://ilkoku.com/editorler-icin): Editörlük ve değerlendirme rehberleri.
- [Yayınevleri için](https://ilkoku.com/yayinevleri-icin): Platform bilgileri ve eser keşfi.

## Yazarlık okulu

- [Kurgu](https://ilkoku.com/yazarlar-icin/kurgu)
- [Edebiyat](https://ilkoku.com/yazarlar-icin/edebiyat)
- [Senaryo ve sahne](https://ilkoku.com/yazarlar-icin/senaryo-ve-sahne)
- [Akademik](https://ilkoku.com/yazarlar-icin/akademik)
- [Bilgilendirici](https://ilkoku.com/yazarlar-icin/bilgilendirici)
- [Çocuk ve gençlik](https://ilkoku.com/yazarlar-icin/cocuk-ve-genclik)
- [Çizgi anlatı](https://ilkoku.com/yazarlar-icin/cizgi-anlati)

## Eser Pasaportu

Eser Pasaportu, platform üzerindeki yazım oturumlarını, revizyonları, sürüm geçmişini ve profesyonel inceleme durumunu bir araya getirir. Eserlerin görünürlüğü platformun rol ve erişim kurallarına bağlıdır.

## Platform ve iletişim

- [Nasıl çalışır?](https://ilkoku.com/nasil-calisir)
- [Editoryal standartlar](https://ilkoku.com/editoryal-standartlar)
- [Hakkımızda](https://ilkoku.com/hakkimizda)
- [İletişim](https://ilkoku.com/iletisim)
- [Kullanım şartları](https://ilkoku.com/yasal/kullanim-sartlari)
- [Gizlilik politikası](https://ilkoku.com/yasal/gizlilik-politikasi)
- [KVKK](https://ilkoku.com/yasal/kvkk)

Bu metin, ana sayfanın herkese açık kısa Markdown özetidir. Güncel içerik ve işlemler için [ana sayfaya](https://ilkoku.com/) başvurun.
`;

const headers = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Accept",
  Link: '<https://ilkoku.com/>; rel="canonical", <https://ilkoku.com/llms.txt>; rel="describedby"; type="text/plain"',
};

export function GET() {
  return new Response(markdown, { headers });
}

export function HEAD() {
  return new Response(null, { headers });
}
