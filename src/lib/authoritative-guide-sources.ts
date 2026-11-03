export type AuthoritativeGuideSource = {
  title: string;
  publisher: string;
  url: string;
  purpose: string;
};

const SOURCES_BY_GUIDE: Readonly<Record<string, readonly AuthoritativeGuideSource[]>> = {
  psikoloji: [
    {
      title: "Mental health",
      publisher: "World Health Organization",
      url: "https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response",
      purpose: "Ruh sağlığı kavramları, koruyucu etkenler ve profesyonel destek sınırları için temel başvuru.",
    },
    {
      title: "ICD-11",
      publisher: "World Health Organization",
      url: "https://icd.who.int/",
      purpose: "Tanı adları ve sınıflandırma terminolojisi kullanılırken birincil sınıflandırma kaynağı.",
    },
  ],
  finans: [
    {
      title: "Finansal Okuryazarlık Platformu",
      publisher: "Sermaye Piyasası Kurulu",
      url: "https://www.spk.gov.tr/finansal-okuryazarlik-platformu",
      purpose: "Finansal kavramlar, risk ve yatırımcı bilgilendirmesi için yetkili eğitim kaynağı.",
    },
    {
      title: "Elektronik Veri Dağıtım Sistemi",
      publisher: "Türkiye Cumhuriyet Merkez Bankası",
      url: "https://evds2.tcmb.gov.tr/",
      purpose: "Faiz, kur, fiyat ve diğer ekonomik veriler için birincil veri kaynağı.",
    },
  ],
  hukuk: [
    {
      title: "Mevzuat Bilgi Sistemi",
      publisher: "T.C. Cumhurbaşkanlığı",
      url: "https://www.mevzuat.gov.tr/",
      purpose: "Yürürlükteki kanun ve ikincil mevzuat metinlerinin doğrulanması için birincil kaynak.",
    },
    {
      title: "Resmî Gazete",
      publisher: "T.C. Cumhurbaşkanlığı",
      url: "https://www.resmigazete.gov.tr/",
      purpose: "Yeni düzenlemelerin yayımlanma tarihi ve özgün metninin doğrulanması için resmî kaynak.",
    },
  ],
  saglik: [
    {
      title: "Rehber ve Kitapçıklar",
      publisher: "T.C. Sağlık Bakanlığı Sağlığın Geliştirilmesi Genel Müdürlüğü",
      url: "https://sggm.saglik.gov.tr/TR-55547/rehber-ve-kitapciklar.html",
      purpose: "Sağlık iletişimi ve sağlık okuryazarlığı içerikleri için güncel resmî rehberler.",
    },
    {
      title: "Türkiye’nin Sağlık Okuryazarlığı Düzeyi",
      publisher: "T.C. Sağlık Bakanlığı Sağlığın Geliştirilmesi Genel Müdürlüğü",
      url: "https://sggm.saglik.gov.tr/TR-57003/turkiyenin-saglik-okuryazarligi-duzeyi-olculdu.html",
      purpose: "Türkiye bağlamındaki sağlık okuryazarlığı tanımı ve araştırma çerçevesi.",
    },
  ],
};

export function getAuthoritativeGuideSources(slug: string) {
  return SOURCES_BY_GUIDE[slug] ?? [];
}
