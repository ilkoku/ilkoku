export type CmsModule = {
  href: string;
  label: string;
  description: string;
  group: "Site" | "İçerik" | "Büyüme" | "Sistem";
  enabled: boolean;
  adminOnly?: boolean;
};

export const cmsModules: CmsModule[] = [
  { href: "/icerik", label: "Genel Bakış", description: "İçerik yönetimi özeti", group: "Site", enabled: true },
  { href: "/icerik/arama", label: "İçerik Ara", description: "CMS içeriklerinde hızlı arama ve doğrudan erişim", group: "Site", enabled: true },
  { href: "/icerik/ana-sayfa", label: "Ana Sayfa", description: "Hero, bölümler, CTA ve footer", group: "Site", enabled: true },
  { href: "/icerik/rol-kartlari", label: "Rol Kartları", description: "Yazar, Okuyucu, Editör ve Yayınevi kartları", group: "Site", enabled: true },
  { href: "/icerik/sayfalar", label: "Sayfalar", description: "Kurumsal ve bilgilendirme sayfaları", group: "Site", enabled: true },
  { href: "/icerik/menuler", label: "Menüler & Footer", description: "Navigasyon, linkler ve footer alanları", group: "Site", enabled: true, adminOnly: true },
  { href: "/icerik/yasal", label: "Yasal Sayfalar", description: "KVKK, gizlilik, çerez ve telif metinleri", group: "Site", enabled: true },
  { href: "/icerik/medya", label: "Medya", description: "Görseller, dosyalar ve alt metinler", group: "İçerik", enabled: true },
  { href: "/icerik/sss", label: "SSS & Yardım", description: "Rol bazlı yardım ve sık sorulan sorular", group: "İçerik", enabled: true },
  { href: "/icerik/duyurular", label: "Duyurular", description: "Platform ve bakım duyuruları", group: "İçerik", enabled: true },
  { href: "/icerik/rehber", label: "Rehber & İçerikler", description: "Editoryal kurumsal içerikler", group: "İçerik", enabled: true },
  { href: "/icerik/yayin-kuyrugu", label: "Yayın Kuyruğu", description: "Bekleyen taslakları önizleme, inceleme ve yayınlama", group: "İçerik", enabled: true },
  { href: "/icerik/zamanlama", label: "Yayın Zamanlama", description: "Planlı yayın ve otomatik yayından kaldırma", group: "İçerik", enabled: true },
  { href: "/icerik/seo", label: "SEO", description: "Meta, canonical, index ve sosyal paylaşım", group: "Büyüme", enabled: true },
  { href: "/icerik/formlar", label: "Formlar & Talepler", description: "Kurumsal formlar ve gelen talepler", group: "Büyüme", enabled: true },
  { href: "/icerik/yonlendirmeler", label: "Yönlendirmeler", description: "Eski URL ve kalıcı 308 yönlendirme kuralları", group: "Büyüme", enabled: true, adminOnly: true },
  { href: "/icerik/diller", label: "Dil Yönetimi", description: "Public diller ve dil bazlı içerik kapsamı", group: "Büyüme", enabled: true, adminOnly: true },
  { href: "/icerik/hazirlik", label: "Yayın Hazırlığı", description: "Sprint 3 canlı içerik kabul kontrolü", group: "Sistem", enabled: true },
  { href: "/icerik/saglik", label: "Sistem Sağlığı", description: "CMS yayın, içerik, SEO ve erişim bütünlük kontrolleri", group: "Sistem", enabled: true },
  { href: "/icerik/gecmis", label: "Sürüm Geçmişi", description: "Revision karşılaştırma ve güvenli geri yükleme", group: "Sistem", enabled: true },
  { href: "/icerik/erisim", label: "İçerik Yetkileri", description: "İçerik yöneticisi ve yayın yetkileri", group: "Sistem", enabled: true, adminOnly: true },
  { href: "/icerik/ayarlar", label: "İçerik Ayarları", description: "CMS davranış ve yayın ayarları", group: "Sistem", enabled: true, adminOnly: true },
];