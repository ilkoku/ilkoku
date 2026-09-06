import type { CmsPageBlock } from "@/lib/cms-page-blocks";

export type CmsPageTemplateKey = "kurumsal" | "surec" | "rol" | "bilgi";

export type CmsPageTemplate = {
  key: CmsPageTemplateKey;
  label: string;
  description: string;
  bestFor: string;
  summary: string;
  blocks: CmsPageBlock[];
  seoDescription: string;
};

export const cmsPageTemplates: readonly CmsPageTemplate[] = [
  {
    key: "kurumsal",
    label: "Kurumsal anlatım",
    description: "Güçlü hero, açıklama, rakamlar, kartlar ve CTA ile kurumsal/güven sayfası.",
    bestFor: "Hakkımızda · güven · kurum yaklaşımı",
    summary: "Bu kısa özeti sayfanın ziyaretçiye ne anlattığını tek paragrafta açıklayacak şekilde düzenleyin.",
    seoDescription: "Sayfanın amacını ve ziyaretçinin burada bulacağı bilgiyi 70-180 karakter arasında özetleyin.",
    blocks: [
      { id: "hero-1", type: "hero", eyebrow: "İlkOku", title: "Sayfanın ana mesajı", text: "Ziyaretçiye bu sayfanın ne sunduğunu güçlü ve kısa bir girişle anlatın.", imageUrl: "", imageAlt: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
      { id: "text-1", type: "text", heading: "Neyi anlatıyoruz?", body: "Bu bölümü gerçek içerikle doldurun.\n\n## Neden önemli?\n\nZiyaretçinin anlayacağı somut bilgiyle devam edin." },
      { id: "stats-1", type: "stats", heading: "Rakamlarla", items: [{ value: "01", label: "Öne çıkan veri" }, { value: "02", label: "İkinci veri" }, { value: "03", label: "Üçüncü veri" }] },
      { id: "cards-1", type: "cards", heading: "Öne çıkanlar", intro: "Temel değerleri veya faydaları kısa kartlarla anlatın.", items: [{ title: "Birinci başlık", text: "Açıklama metni", label: "", href: "" }, { title: "İkinci başlık", text: "Açıklama metni", label: "", href: "" }, { title: "Üçüncü başlık", text: "Açıklama metni", label: "", href: "" }] },
      { id: "cta-1", type: "cta", heading: "Sonraki adım", text: "Ziyaretçinin buradan sonra ne yapabileceğini anlatın.", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
    ],
  },
  {
    key: "surec",
    label: "Süreç / adımlar",
    description: "Hero, adımlar, görsel+metin, SSS ve CTA ile süreç anlatımı.",
    bestFor: "Nasıl çalışır · başvuru · işlem akışı",
    summary: "Bu özeti sürecin kim için olduğunu ve ziyaretçinin sayfada hangi adımları öğreneceğini anlatacak şekilde düzenleyin.",
    seoDescription: "Sürecin başlangıcını, ana adımlarını ve sonucunu arama sonucunda anlaşılır biçimde özetleyin.",
    blocks: [
      { id: "hero-1", type: "hero", eyebrow: "Süreç", title: "Nasıl ilerliyor?", text: "Süreci tek cümlede tanıtın.", imageUrl: "", imageAlt: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
      { id: "steps-1", type: "steps", heading: "Adım adım", intro: "Ziyaretçinin izleyeceği akışı açıklayın.", items: [{ title: "Başlangıç", text: "İlk adımın ne olduğunu açıklayın." }, { title: "İnceleme", text: "İkinci adımda ne olduğunu açıklayın." }, { title: "Sonuç", text: "Sürecin nasıl tamamlandığını açıklayın." }] },
      { id: "split-1", type: "split", heading: "Sürecin önemli noktası", body: "Bu alanı destekleyici açıklamayla doldurun.", imageUrl: "", imageAlt: "", imageSide: "right" },
      { id: "faq-1", type: "faq", heading: "Sık sorulan sorular", items: [{ question: "Bu süreç ne kadar sürer?", answer: "Gerçek yanıtı buraya yazın." }, { question: "Kimler kullanabilir?", answer: "Gerçek yanıtı buraya yazın." }] },
      { id: "cta-1", type: "cta", heading: "Hazır mısınız?", text: "Sonraki adıma yönlendiren kısa metin.", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
    ],
  },
  {
    key: "rol",
    label: "Rol / hedef kitle",
    description: "Belirli kullanıcı grubuna özel hero, fayda kartları, alıntı ve CTA.",
    bestFor: "Yazar · okuyucu · editör · yayınevi",
    summary: "Bu özeti hedef kitlenin İlkOku'da ne yapabildiğini ve bu sayfanın ona nasıl yardımcı olduğunu açıklayacak şekilde düzenleyin.",
    seoDescription: "Hedef kullanıcı grubunun İlkOku'daki imkanlarını ve izleyeceği yolu arama sonucuna uygun şekilde özetleyin.",
    blocks: [
      { id: "hero-1", type: "hero", eyebrow: "Sizin için", title: "Hedef kitlenin ana faydası", text: "Bu kullanıcı grubunun İlkOku'da ne yapabileceğini anlatın.", imageUrl: "", imageAlt: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
      { id: "cards-1", type: "cards", heading: "Neler yapabilirsiniz?", intro: "En önemli faydaları seçin.", items: [{ title: "Fayda 1", text: "Açıklama", label: "", href: "" }, { title: "Fayda 2", text: "Açıklama", label: "", href: "" }, { title: "Fayda 3", text: "Açıklama", label: "", href: "" }] },
      { id: "quote-1", type: "quote", quote: "Bu alana rolün ruhunu anlatan güçlü bir cümle yazın.", attribution: "" },
      { id: "cta-1", type: "cta", heading: "İlk adımı atın", text: "Kullanıcıyı doğru alana yönlendirin.", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
    ],
  },
  {
    key: "bilgi",
    label: "Bilgi / karşılaştırma",
    description: "Hero, açıklama, karşılaştırma tablosu, görsel ve SSS ile bilgi sayfası.",
    bestFor: "Kriterler · kapsam · karşılaştırma",
    summary: "Bu özeti ziyaretçinin hangi bilgileri karşılaştırabileceğini veya hangi kriterleri anlayacağını açıklayacak şekilde düzenleyin.",
    seoDescription: "Sayfadaki kriterleri, seçenekleri veya karşılaştırma bilgisini arama sonucuna uygun biçimde özetleyin.",
    blocks: [
      { id: "hero-1", type: "hero", eyebrow: "Bilgi", title: "Konuyu açık ve net anlatın", text: "Ziyaretçinin burada ne öğreneceğini açıklayın.", imageUrl: "", imageAlt: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" },
      { id: "text-1", type: "text", heading: "Temel kriterler", body: "- Birinci kriter\n- İkinci kriter\n- Üçüncü kriter" },
      { id: "table-1", type: "table", heading: "Karşılaştırma", columns: ["Başlık", "Açıklama"], rows: [["Örnek 1", "Gerçek bilgiyle değiştirin"], ["Örnek 2", "Gerçek bilgiyle değiştirin"]] },
      { id: "image-1", type: "image", imageUrl: "", alt: "", caption: "", layout: "wide" },
      { id: "faq-1", type: "faq", heading: "Sık sorulan sorular", items: [{ question: "İlk soru", answer: "Yanıt" }] },
    ],
  },
] as const;

export function getCmsPageTemplate(value: string | null | undefined) {
  return cmsPageTemplates.find((template) => template.key === value) ?? cmsPageTemplates[0];
}
