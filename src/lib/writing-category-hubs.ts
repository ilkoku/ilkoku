import type { GenreCategory } from "@/lib/genres";

export type WritingCategoryHub = {
  category: GenreCategory;
  slug: string;
  href: string;
  title: string;
  cardText: string;
  lead: string;
  definition: string;
  difference: string;
  invitation: string;
};

export const WRITING_CATEGORY_HUBS: readonly WritingCategoryHub[] = [
  {
    category: "Kurgu",
    slug: "kurgu",
    href: "/yazarlar-icin/kurgu",
    title: "Kurgu",
    cardText: "Roman, öykü, fantastik, polisiye ve diğer kurgu eğitimlerini keşfet.",
    lead: "Gerçekte olmayanı yazmak değil, kendi gerçekliğini kurmaktır.",
    definition: "Kurgu; karakterlerin, olayların, dünyaların ve çatışmaların yazar tarafından oluşturulduğu anlatı alanıdır. Bazen bugünkü dünyaya çok yakın bir roman, bazen hiç var olmamış bir fantastik evren, bazen gelecekte geçen bir bilim kurgu ya da çözülmesi gereken bir polisiye olabilir.",
    difference: "Her kurgu türü aynı şekilde yazılmaz. Polisiye ipucu ve çözüm mantığıyla, fantastik dünya ve kurallarla, bilim kurgu varsayım ve nedensellikle, gerilim baskı ve beklentiyle, psikolojik roman ise karakterin iç dünyasıyla çalışır.",
    invitation: "Tür menüsünden yazmak istediğin kurgu türünü seç. İlkOku sana o türe özgü fikir, yapı, karakter, taslak, örnek proje ve revizyon eğitimini adım adım gösterecek.",
  },
  {
    category: "Edebiyat",
    slug: "edebiyat",
    href: "/yazarlar-icin/edebiyat",
    title: "Edebiyat",
    cardText: "Şiirden denemeye, anıdan biyografiye edebî anlatı eğitimlerini keşfet.",
    lead: "Aynı deneyim, anlatım biçimi değiştiğinde başka bir esere dönüşür.",
    definition: "Edebiyat; ses, biçim, bakış ve dil aracılığıyla düşünceyi, deneyimi ve insanı anlatmanın farklı yollarını bir araya getirir. Şiir yoğunlaştırır, deneme düşünceyi araştırır, anı yaşanmış deneyimi seçerek kurar, biyografi ise başka bir hayatı kaynaklarla görünür kılar.",
    difference: "Bu türlerde yalnız konu değil, anlatıcının konumu ve metnin okurla kurduğu sözleşme değişir. Şiirde ritim ve imge, denemede düşünce hareketi, anıda hafıza, eleştiride ise gerekçeli değerlendirme öne çıkar.",
    invitation: "Tür menüsünden yazmak istediğin edebiyat biçimini seç ve o forma özgü anlatım, yapı, taslak ve revizyon eğitimine geç.",
  },
  {
    category: "Senaryo ve Sahne",
    slug: "senaryo-ve-sahne",
    href: "/yazarlar-icin/senaryo-ve-sahne",
    title: "Senaryo ve Sahne",
    cardText: "Film, dizi, tiyatro, podcast ve sahne anlatısı eğitimlerini keşfet.",
    lead: "Burada metin yalnız okunmaz; görülür, duyulur ve oynanır.",
    definition: "Senaryo ve sahne yazarlığı, hikâyeyi performansa dönüşecek biçimde kurar. Sahne, sekans, diyalog, ritim, süre ve görsel-işitsel anlatım; yazılan metnin nasıl deneyimleneceğini doğrudan belirler.",
    difference: "Film senaryosu görüntü ve kurgu üzerinden, dizi bölüm ve sezon yapısıyla, tiyatro canlı sahnenin sınırlarıyla, podcast ve radyo ise sesin taşıdığı bilgi ve atmosferle çalışır.",
    invitation: "Tür menüsünden üretmek istediğin formatı seç ve o mecranın sahne, yapı, diyalog ve taslak eğitimine geç.",
  },
  {
    category: "Akademik",
    slug: "akademik",
    href: "/yazarlar-icin/akademik",
    title: "Akademik",
    cardText: "Makale, tez, araştırma, bildiri ve akademik inceleme eğitimlerini keşfet.",
    lead: "İyi akademik metin, bilgiyi yalnız toplamaz; soruyu yöntem ve kanıtla cevaplar.",
    definition: "Akademik yazım; araştırma sorusunu, yöntemi, kaynakları, bulguları ve gerekçeli sonucu açık bir yapı içinde birleştirir. Metnin güvenilirliği yalnız ne söylediğine değil, bunu hangi kanıtla ve nasıl temellendirdiğine bağlıdır.",
    difference: "Makale, tez, bildiri, vaka analizi ve araştırma aynı amacı taşımaz. Uzunluk, yöntem, kaynak kullanımı, bölüm yapısı ve kanıt yükü çalışma türüne göre değişir.",
    invitation: "Tür menüsünden hazırlayacağın akademik çalışma biçimini seç ve araştırma sorusundan kaynak düzenine, taslaktan son kontrole kadar ilgili eğitime geç.",
  },
  {
    category: "Bilgilendirici",
    slug: "bilgilendirici",
    href: "/yazarlar-icin/bilgilendirici",
    title: "Bilgilendirici",
    cardText: "Tarih, psikoloji, teknoloji, finans ve diğer bilgi odaklı yazı eğitimlerini keşfet.",
    lead: "Bilgiyi aktarmak yetmez; okurun anlayabileceği bir yol kurmak gerekir.",
    definition: "Bilgilendirici eserler; uzmanlık, araştırma veya deneyimi okurun takip edebileceği bir yapıya dönüştürür. Güçlü bir metin neyi açıklayacağını, hangi sırayla açıklayacağını ve hangi iddianın hangi kaynağa dayanacağını bilir.",
    difference: "Tarih, psikoloji, hukuk, teknoloji, finans veya gastronomi aynı anlatım sorumluluğuna sahip değildir. Kaynak türü, örnek kullanımı, teknik dil ve okura verilen bağlam konu alanına göre değişir.",
    invitation: "Tür menüsünden yazacağın bilgi alanını seç ve içeriği araştırmadan bölümlendirmeye, örneklerden son kontrole kadar ilgili eğitime geç.",
  },
  {
    category: "Çocuk ve Gençlik",
    slug: "cocuk-ve-genclik",
    href: "/yazarlar-icin/cocuk-ve-genclik",
    title: "Çocuk ve Gençlik",
    cardText: "Masal, çocuk hikâyesi, çocuk romanı ve genç yetişkin eğitimlerini keşfet.",
    lead: "Yaşa göre sadeleştirmek değil, doğru okura doğru anlatım kurmaktır.",
    definition: "Çocuk ve gençlik yazarlığı; yaş, gelişim düzeyi, dil, ritim, tema ve karakter bakışını birlikte düşünür. Okurun yaşı küçüldükçe hikâyenin değeri küçülmez; yalnız anlatımın sorumluluğu değişir.",
    difference: "Masal, fabl, çocuk hikâyesi, çocuk romanı ve genç yetişkin metni; uzunluk, kelime seçimi, çatışma yoğunluğu, anlatıcı ve duygusal karmaşıklık bakımından farklı çalışır.",
    invitation: "Tür menüsünden hedeflediğin yaş ve eser biçimini seç; o okura uygun fikir, karakter, yapı, dil ve revizyon eğitimine geç.",
  },
  {
    category: "Çizgi Anlatı",
    slug: "cizgi-anlati",
    href: "/yazarlar-icin/cizgi-anlati",
    title: "Çizgi Anlatı",
    cardText: "Çizgi roman, grafik roman, manga, webtoon ve karikatür eğitimlerini keşfet.",
    lead: "Hikâye burada yalnız cümlelerle değil, görüntü ve boşlukla da anlatılır.",
    definition: "Çizgi anlatı; metin, görsel, kadraj, panel, geçiş ve ritmi tek anlatım sistemi içinde birleştirir. Bir sahnenin ne kadarının yazıyla, ne kadarının görüntüyle anlatılacağı eserin temposunu ve okurun deneyimini değiştirir.",
    difference: "Çizgi roman ve grafik roman sayfa kompozisyonuyla, manga farklı okuma ve görsel ritim gelenekleriyle, webtoon dikey akışla, karikatür ise yoğunlaştırılmış tek fikir veya kısa sekansla çalışabilir.",
    invitation: "Tür menüsünden kullanacağın çizgi anlatı biçimini seç ve senaryodan panel akışına, ritimden revizyona kadar ilgili eğitime geç.",
  },
] as const;

export function getWritingCategoryHub(slug: string): WritingCategoryHub {
  const hub = WRITING_CATEGORY_HUBS.find((item) => item.slug === slug);
  if (!hub) throw new Error(`Writing category hub definition missing: ${slug}`);
  return hub;
}
