export type CmsModule = {
  href: string;
  label: string;
  description: string;
  group: "Site" | "İçerik" | "Büyüme" | "Sistem";
};

export const cmsModules: CmsModule[] = [
  { href: "/icerik", label: "Genel Bakış", description: "İçerik yönetimi özeti", group: "Site" },
  { href: "/icerik/ana-sayfa", label: "Ana Sayfa", description: "Hero, bölümler, CTA ve footer", group: "Site" },
  { href: "/icerik/sayfalar", label: "Sayfalar", description: "Kurumsal ve bilgilendirme sayfaları", group: "Site" },
  { href: "/icerik/menuler", label: "Menüler & Footer", description: "Navigasyon, linkler ve footer alanları", group: "Site" },
  { href: "/icerik/yasal", label: "Yasal Sayfalar", description: "KVKK, gizlilik, çerez ve telif metinleri", group: "Site" },
  { href: "/icerik/medya", label: "Medya", description: "Görseller, dosyalar ve alt metinler", group: "İçerik" },
  { href: "/icerik/sss", label: "SSS & Yardım", description: "Rol bazlı yardım ve sık sorulan sorular", group: "İçerik" },
  { href: "/icerik/duyurular", label: "Duyurular", description: "Platform ve bakım duyuruları", group: "İçerik" },
  { href: "/icerik/rehber", label: "Rehber & İçerikler", description: "Editoryal kurumsal içerikler", group: "İçerik" },
  { href: "/icerik/seo", label: "SEO", description: "Meta, canonical, index ve sosyal paylaşım", group: "Büyüme" },
  { href: "/icerik/formlar", label: "Formlar & Talepler", description: "Kurumsal formlar ve gelen talepler", group: "Büyüme" },
  { href: "/icerik/yonlendirmeler", label: "Yönlendirmeler", description: "Eski URL ve 301 yönlendirme kuralları", group: "Büyüme" },
  { href: "/icerik/diller", label: "Dil Altyapısı", description: "Gelecekte çok dil için içerik sözleşmesi", group: "Büyüme" },
  { href: "/icerik/gecmis", label: "Değişiklik Geçmişi", description: "Revision ve yayın hareketleri", group: "Sistem" },
  { href: "/icerik/ayarlar", label: "İçerik Ayarları", description: "CMS davranış ve yayın ayarları", group: "Sistem" },
];
