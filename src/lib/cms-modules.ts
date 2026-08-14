export type CmsModule = {
  href: string;
  label: string;
  description: string;
  group: "Site" | "İçerik" | "Büyüme" | "Sistem";
  enabled: boolean;
};

export const cmsModules: CmsModule[] = [
  { href: "/icerik", label: "Genel Bakış", description: "İçerik yönetimi özeti", group: "Site", enabled: true },
  { href: "/icerik/ana-sayfa", label: "Ana Sayfa", description: "Hero, bölümler, CTA ve footer", group: "Site", enabled: true },
  { href: "/icerik/sayfalar", label: "Sayfalar", description: "Kurumsal ve bilgilendirme sayfaları", group: "Site", enabled: true },
  { href: "/icerik/menuler", label: "Menüler & Footer", description: "Navigasyon, linkler ve footer alanları", group: "Site", enabled: true },
  { href: "/icerik/yasal", label: "Yasal Sayfalar", description: "KVKK, gizlilik, çerez ve telif metinleri", group: "Site", enabled: true },
  { href: "/icerik/medya", label: "Medya", description: "Görseller, dosyalar ve alt metinler", group: "İçerik", enabled: true },
  { href: "/icerik/sss", label: "SSS & Yardım", description: "Rol bazlı yardım ve sık sorulan sorular", group: "İçerik", enabled: true },
  { href: "/icerik/duyurular", label: "Duyurular", description: "Platform ve bakım duyuruları", group: "İçerik", enabled: false },
  { href: "/icerik/rehber", label: "Rehber & İçerikler", description: "Editoryal kurumsal içerikler", group: "İçerik", enabled: false },
  { href: "/icerik/seo", label: "SEO", description: "Meta, canonical, index ve sosyal paylaşım", group: "Büyüme", enabled: true },
  { href: "/icerik/formlar", label: "Formlar & Talepler", description: "Kurumsal formlar ve gelen talepler", group: "Büyüme", enabled: true },
  { href: "/icerik/yonlendirmeler", label: "Yönlendirmeler", description: "Eski URL ve 301 yönlendirme kuralları", group: "Büyüme", enabled: false },
  { href: "/icerik/diller", label: "Dil Altyapısı", description: "Gelecekte çok dil için içerik sözleşmesi", group: "Büyüme", enabled: false },
  { href: "/icerik/gecmis", label: "Değişiklik Geçmişi", description: "Revision ve yayın hareketleri", group: "Sistem", enabled: true },
  { href: "/icerik/ayarlar", label: "İçerik Ayarları", description: "CMS davranış ve yayın ayarları", group: "Sistem", enabled: false },
];
