import type { SpecialBookSectionKind } from "./book-structure";

type BookTemplateContext = {
  workTitle: string;
  authorName: string;
  year?: number;
};

export function buildBookSectionTemplate(
  kind: SpecialBookSectionKind,
  context: BookTemplateContext,
) {
  const year = context.year ?? new Date().getFullYear();
  const workTitle = context.workTitle.trim() || "[Eser adı]";
  const authorName = context.authorName.trim() || "[Yazar adı]";

  switch (kind) {
    case "title_page":
      return `${workTitle}\n\n${authorName}\n\n[Yayınevi / baskı bilgisi — isteğe bağlı]`;
    case "copyright":
      return `© ${year} ${authorName}\nTüm hakları saklıdır.\n\nEser: ${workTitle}\nYazar: ${authorName}\nEditör: [Ad Soyad]\nKapak tasarımı: [Ad Soyad]\nISBN: [Yayınevi tarafından eklenecek]\nBaskı: [1. Baskı · Ay ${year}]\nYayınevi: [Yayınevi adı]\nBasım yeri: [Şehir]`;
    case "dedication":
      return "[Bu kitabı ithaf etmek istediğin kişi veya kişilere kısa notunu buraya yaz.]";
    case "epigraph":
      return "“[Alıntı veya kısa söz]”\n\n— [Yazar / kaynak]";
    case "toc":
      return "";
    case "preface":
      return "Bu kitabı yazma nedenim:\n[Buraya kısa açıklamanı yaz.]\n\nOkura notum:\n[Okurun kitabı okumadan önce bilmesini istediğin şeyi yaz.]";
    case "prologue":
      return "[Ana hikâyeden önce gelen giriş sahnesini veya anlatıyı buradan başlat.]";
    case "epilogue":
      return "[Ana hikâyenin ardından gelen kapanış bölümünü buraya yaz.]";
    case "acknowledgements":
      return "Bu kitabın ortaya çıkmasına katkı sağlayanlara teşekkürlerim:\n\n[İsim / kurum — kısa teşekkür notu]";
    case "author_bio":
      return `${authorName}\n\n[Kısa yazar biyografisi]\n\n[Edebî ilgi alanları / yayımlanmış eserler]\n\n[Web sitesi veya sosyal medya — isteğe bağlı]`;
  }
}
