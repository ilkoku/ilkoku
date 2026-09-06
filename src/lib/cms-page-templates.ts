export type CmsPageTemplateKey = "kurumsal" | "surec" | "rol" | "bilgi";

export type CmsPageTemplate = {
  key: CmsPageTemplateKey;
  label: string;
  description: string;
  bestFor: string;
  summary: string;
  body: string;
  seoDescription: string;
};

export const cmsPageTemplates: readonly CmsPageTemplate[] = [
  {
    key: "kurumsal",
    label: "Kurumsal anlatım",
    description: "Hakkımızda, kurum yaklaşımı, güven veya genel bilgilendirme sayfaları için dengeli yapı.",
    bestFor: "Kurumsal bilgi · güven · politika özeti",
    summary: "Bu kısa özeti sayfanın ziyaretçiye ne anlattığını tek paragrafta açıklayacak şekilde düzenleyin.",
    body: "Bu giriş paragrafını sayfanın ana mesajıyla değiştirin.\n\n## Neyi anlatıyoruz?\n\nBu bölümü gerçek içerikle doldurun.\n\n## Neden önemli?\n\nBu bölümü ziyaretçinin anlayacağı somut bilgiyle tamamlayın.\n\n## Sonraki adım\n\nZiyaretçinin buradan sonra ne yapabileceğini açıklayın.",
    seoDescription: "Sayfanın amacını ve ziyaretçinin burada bulacağı bilgiyi 70-180 karakter arasında özetleyin.",
  },
  {
    key: "surec",
    label: "Süreç / adımlar",
    description: "Nasıl çalışır, başvuru akışı, işlem sırası veya aşamalı anlatımlar için hazır iskelet.",
    bestFor: "Nasıl çalışır · başvuru · işlem akışı",
    summary: "Bu özeti sürecin kim için olduğunu ve ziyaretçinin sayfada hangi adımları öğreneceğini anlatacak şekilde düzenleyin.",
    body: "Süreci tek paragrafta tanıtın.\n\n## 1. Başlangıç\n\nİlk adımın ne olduğunu açıklayın.\n\n## 2. İnceleme\n\nİkinci adımda ne olduğunu açıklayın.\n\n## 3. Sonuç\n\nSürecin nasıl tamamlandığını ve sonraki adımı açıklayın.",
    seoDescription: "Sürecin başlangıcını, ana adımlarını ve sonucunu arama sonucunda anlaşılır biçimde özetleyin.",
  },
  {
    key: "rol",
    label: "Rol / hedef kitle",
    description: "Yazar, okuyucu, editör, yayınevi veya belirli bir kullanıcı grubuna yönelik açıklama sayfası.",
    bestFor: "Rol sayfası · kullanıcı rehberi · fayda anlatımı",
    summary: "Bu özeti hedef kitlenin İlkOku'da ne yapabildiğini ve bu sayfanın ona nasıl yardımcı olduğunu açıklayacak şekilde düzenleyin.",
    body: "Hedef kullanıcıyı ve sayfanın amacını tanıtın.\n\n## Neler yapabilirsiniz?\n\n- İlk temel faydayı yazın.\n- İkinci temel faydayı yazın.\n- Üçüncü temel faydayı yazın.\n\n## Nasıl ilerlersiniz?\n\nKullanıcının izleyeceği yolu açıklayın.\n\n## Bilmeniz gerekenler\n\nYetki, güvenlik veya süreç sınırlarını gerçek içerikle açıklayın.",
    seoDescription: "Hedef kullanıcı grubunun İlkOku'daki imkanlarını ve izleyeceği yolu arama sonucuna uygun şekilde özetleyin.",
  },
  {
    key: "bilgi",
    label: "Bilgi / karşılaştırma",
    description: "Kriter, kapsam, seçenek veya karşılaştırmalı bilgiyi başlık, liste ve tabloyla sunmak için.",
    bestFor: "Kriterler · kapsam · karşılaştırma · açıklayıcı tablo",
    summary: "Bu özeti ziyaretçinin hangi bilgileri karşılaştırabileceğini veya hangi kriterleri anlayacağını açıklayacak şekilde düzenleyin.",
    body: "Konuyu ve karşılaştırmanın amacını açıklayın.\n\n## Temel kriterler\n\n- Birinci kriteri yazın.\n- İkinci kriteri yazın.\n- Üçüncü kriteri yazın.\n\n## Karşılaştırma\n\nBaşlık | Açıklama\n--- | ---\nÖrnek 1 | Gerçek bilgiyle değiştirin\nÖrnek 2 | Gerçek bilgiyle değiştirin\n\n## Değerlendirme\n\nTablonun nasıl okunması gerektiğini açıklayın.",
    seoDescription: "Sayfadaki kriterleri, seçenekleri veya karşılaştırma bilgisini arama sonucuna uygun biçimde özetleyin.",
  },
] as const;

export function getCmsPageTemplate(value: string | null | undefined) {
  return cmsPageTemplates.find((template) => template.key === value) ?? cmsPageTemplates[0];
}
