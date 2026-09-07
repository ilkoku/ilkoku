export const bookSectionKinds = [
  "chapter",
  "title_page",
  "copyright",
  "dedication",
  "epigraph",
  "toc",
  "preface",
  "prologue",
  "epilogue",
  "acknowledgements",
  "author_bio",
] as const;

export type BookSectionKind = (typeof bookSectionKinds)[number];

export const specialBookSectionKinds = [
  "title_page",
  "copyright",
  "dedication",
  "epigraph",
  "toc",
  "preface",
  "prologue",
  "epilogue",
  "acknowledgements",
  "author_bio",
] as const satisfies readonly BookSectionKind[];

export type SpecialBookSectionKind =
  (typeof specialBookSectionKinds)[number];

export type BookStructureItem = {
  id: string;
  chapterId: string | null;
  chapterPosition: number | null;
  kind: BookSectionKind;
  title: string;
  content: string;
  position: number;
  isAutomatic: boolean;
  updatedAt: string;
  wordCount: number;
};

export const bookSectionDetails: Record<
  BookSectionKind,
  {
    label: string;
    defaultTitle: string;
    description: string;
    bodyPlaceholder: string;
  }
> = {
  chapter: {
    label: "Bölüm",
    defaultTitle: "Bölüm",
    description: "Ana metin bölümü",
    bodyPlaceholder: "Bölümünü yazmaya başla…",
  },
  title_page: {
    label: "İç Kapak",
    defaultTitle: "İç Kapak",
    description: "Kitap adı, yazar adı ve yayınevi bilgileri için ön sayfa",
    bodyPlaceholder: "İç kapakta yer almasını istediğin ek bilgileri yaz…",
  },
  copyright: {
    label: "Künye",
    defaultTitle: "Künye",
    description: "Telif, baskı, ISBN, editör ve yayın bilgileri",
    bodyPlaceholder: "Künye ve telif bilgilerini yaz…",
  },
  dedication: {
    label: "İthaf",
    defaultTitle: "İthaf",
    description: "Kitabın ithaf edildiği kişi veya kişiler",
    bodyPlaceholder: "İthaf metnini yaz…",
  },
  epigraph: {
    label: "Epigraf",
    defaultTitle: "Epigraf",
    description: "Kitabın başındaki kısa alıntı veya söz",
    bodyPlaceholder: "Epigraf metnini yaz…",
  },
  toc: {
    label: "İçindekiler",
    defaultTitle: "İçindekiler",
    description: "Yayınla dediğinde kitap sırasına göre otomatik oluşturulur",
    bodyPlaceholder: "İçindekiler yayın sırasında otomatik hazırlanır.",
  },
  preface: {
    label: "Önsöz",
    defaultTitle: "Önsöz",
    description: "Yazarın veya sunan kişinin kitap öncesi açıklaması",
    bodyPlaceholder: "Önsöz metnini yaz…",
  },
  prologue: {
    label: "Prolog",
    defaultTitle: "Prolog",
    description: "Ana hikâyeden önce gelen giriş bölümü",
    bodyPlaceholder: "Prolog metnini yaz…",
  },
  epilogue: {
    label: "Epilog",
    defaultTitle: "Epilog",
    description: "Ana hikâyeden sonra gelen kapanış bölümü",
    bodyPlaceholder: "Epilog metnini yaz…",
  },
  acknowledgements: {
    label: "Teşekkür",
    defaultTitle: "Teşekkür",
    description: "Kitabın hazırlanmasına katkıda bulunanlara teşekkür",
    bodyPlaceholder: "Teşekkür metnini yaz…",
  },
  author_bio: {
    label: "Yazar Hakkında",
    defaultTitle: "Yazar Hakkında",
    description: "Kitabın sonunda yer alan kısa yazar biyografisi",
    bodyPlaceholder: "Yazar biyografisini yaz…",
  },
};

export const tableOfContentsIncludedKinds = [
  "preface",
  "prologue",
  "chapter",
  "epilogue",
  "acknowledgements",
  "author_bio",
] as const satisfies readonly BookSectionKind[];

export function isBookSectionKind(value: string): value is BookSectionKind {
  return (bookSectionKinds as readonly string[]).includes(value);
}

export function isSpecialBookSectionKind(
  value: string,
): value is SpecialBookSectionKind {
  return (specialBookSectionKinds as readonly string[]).includes(value);
}
