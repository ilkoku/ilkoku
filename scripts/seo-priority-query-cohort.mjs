export const PRIORITY_QUERY_GROUPS = [
  {
    id: "brand",
    label: "İlkOku Marka",
    entries: [
      { query: "ilkoku", landingPages: ["/"] },
      { query: "ilkoku dijital yazar platformu", landingPages: ["/"] },
      { query: "ilkoku yazar platformu", landingPages: ["/"] },
      { query: "ilkoku nasıl çalışır", landingPages: ["/nasil-calisir"] },
    ],
  },
  {
    id: "writers",
    label: "Yazarlar",
    entries: [
      { query: "yazarlar için", landingPages: ["/yazarlar-icin"] },
      { query: "yazarlık eğitimi", landingPages: ["/yazarlar-icin"] },
      { query: "yazar olmak", landingPages: ["/yazarlar-icin"] },
      { query: "yazar nasıl olunur", landingPages: ["/yazarlar-icin"] },
    ],
  },
  {
    id: "writing-categories",
    label: "Yazarlık Türleri",
    entries: [
      { query: "kurgu yazarlığı", landingPages: ["/yazarlar-icin/kurgu"] },
      { query: "edebiyat yazarlığı", landingPages: ["/yazarlar-icin/edebiyat"] },
      { query: "akademik yazarlık", landingPages: ["/yazarlar-icin/akademik"] },
      { query: "bilgilendirici yazarlık", landingPages: ["/yazarlar-icin/bilgilendirici"] },
      { query: "senaryo yazarlığı", landingPages: ["/yazarlar-icin/senaryo-ve-sahne"] },
      { query: "çocuk kitabı yazarlığı", landingPages: ["/yazarlar-icin/cocuk-ve-genclik"] },
      { query: "çizgi anlatı yazarlığı", landingPages: ["/yazarlar-icin/cizgi-anlati"] },
      { query: "roman yazma", landingPages: ["/yazarlar-icin/kurgu/roman"] },
      { query: "öykü yazma", landingPages: ["/yazarlar-icin/kurgu/oyku"] },
      { query: "fantastik yazma", landingPages: ["/yazarlar-icin/kurgu/fantastik"] },
      { query: "bilim kurgu yazma", landingPages: ["/yazarlar-icin/kurgu/bilim-kurgu"] },
      { query: "distopya yazma", landingPages: ["/yazarlar-icin/kurgu/distopya"] },
      { query: "şiir yazma", landingPages: ["/yazarlar-icin/edebiyat/siir"] },
    ],
  },
  {
    id: "readers",
    label: "Okurlar",
    entries: [
      { query: "okurlar için", landingPages: ["/okurlar-icin"] },
      { query: "okumaya başlama", landingPages: ["/okurlar-icin/okumaya-baslama"] },
      { query: "okuma alışkanlığı", landingPages: ["/okurlar-icin/okumaya-baslama"] },
      { query: "kitap okumaya nasıl başlanır", landingPages: ["/okurlar-icin/okumaya-baslama"] },
    ],
  },
  {
    id: "editors",
    label: "Editörler",
    entries: [
      { query: "editörler için", landingPages: ["/editorler-icin"] },
      { query: "editörlüğe başlama", landingPages: ["/editorler-icin/egitim/editorluge-baslama"] },
      { query: "editör nasıl olunur", landingPages: ["/editorler-icin/egitim/editorluge-baslama"] },
      { query: "dil ve anlatım editörlüğü", landingPages: ["/editorler-icin/egitim/dil-ve-anlatim-editorlugu"] },
      { query: "metin değerlendirme", landingPages: ["/editorler-icin/egitim/metin-degerlendirme"] },
    ],
  },
  {
    id: "publishers",
    label: "Yayınevleri",
    entries: [
      { query: "yayınevleri için", landingPages: ["/yayinevleri-icin"] },
      { query: "yayınevi eser değerlendirme", landingPages: ["/yayinevleri-icin"] },
      { query: "yayınevine eser gönderme", landingPages: ["/yayinevleri-icin"] },
      { query: "yayınevi yazar keşfi", landingPages: ["/yayinevleri-icin"] },
    ],
  },
  {
    id: "trust-process",
    label: "Süreç ve Editoryal Güven",
    entries: [
      { query: "editoryal standartlar", landingPages: ["/editoryal-standartlar"] },
      { query: "editoryal değerlendirme standartları", landingPages: ["/editoryal-standartlar"] },
      { query: "ilkoku hakkında", landingPages: ["/hakkimizda"] },
      { query: "dijital yazar platformu nasıl çalışır", landingPages: ["/nasil-calisir"] },
    ],
  },
];

export const PRIORITY_QUERY_GROUP_IDS = PRIORITY_QUERY_GROUPS.map((group) => group.id);

export function expectedLandingPages(group) {
  return [...new Set(group.entries.flatMap((entry) => entry.landingPages))];
}

export function queryExpressions(group) {
  return group.entries.map((entry) => entry.query);
}
