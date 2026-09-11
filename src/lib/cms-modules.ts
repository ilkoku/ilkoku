export type CmsModuleMode = "controlled-write" | "read-only-audit" | "admin-control";
export type CmsModuleGroup = "Başlangıç" | "Sayfalar" | "Medya & Eğitim" | "Yayın & Görünürlük" | "Yönetim";

export type CmsModule = {
  href: string;
  label: string;
  description: string;
  group: CmsModuleGroup;
  enabled: boolean;
  mode: CmsModuleMode;
  adminOnly?: boolean;
  showInNavigation?: boolean;
};

export const cmsModules: CmsModule[] = [
  { href: "/icerik", label: "Genel Bakış", description: "İçerik yönetimi özeti, öncelikler ve son hareketler", group: "Başlangıç", enabled: true, mode: "read-only-audit" },
  { href: "/icerik/arama", label: "İçerik Ara", description: "CMS içindeki sayfa, medya ve kayıtları tek yerden ara", group: "Başlangıç", enabled: true, mode: "read-only-audit" },

  { href: "/icerik/ana-sayfa", label: "Ana Sayfa", description: "Ana sayfa hero, bölümler ve CTA içeriklerini yönet", group: "Sayfalar", enabled: true, mode: "controlled-write" },
  { href: "/icerik/ana-sayfa/history", label: "Ana Sayfa Geçmişi", description: "Ana sayfanın History 1–15 içerik parçaları", group: "Sayfalar", enabled: true, mode: "controlled-write", showInNavigation: false },
  { href: "/icerik/sayfalar", label: "Site Sayfaları", description: "Hakkımızda, Nasıl Çalışır, güven ve diğer public sayfalar", group: "Sayfalar", enabled: true, mode: "controlled-write" },
  { href: "/icerik/sayfalar/sablonlar", label: "Sayfa Şablonları", description: "Hazır İlkOku iskeletlerinden yeni public sayfa başlat", group: "Sayfalar", enabled: true, mode: "controlled-write", showInNavigation: false },
  { href: "/icerik/rol-kartlari", label: "Rol Kartları", description: "Yazar, Okuyucu, Editör ve Yayınevi kartları", group: "Sayfalar", enabled: true, mode: "controlled-write" },
  { href: "/icerik/yasal", label: "Yasal Sayfalar", description: "KVKK, gizlilik, çerez ve telif metinleri", group: "Sayfalar", enabled: true, mode: "controlled-write" },
  { href: "/icerik/sss", label: "SSS & Yardım", description: "Rol bazlı yardım ve sık sorulan sorular", group: "Sayfalar", enabled: true, mode: "controlled-write" },
  { href: "/icerik/duyurular", label: "Duyurular", description: "Platform ve bakım duyuruları", group: "Sayfalar", enabled: true, mode: "controlled-write" },
  { href: "/icerik/menuler", label: "Menüler & Footer", description: "Site navigasyonu, linkler ve footer alanları", group: "Sayfalar", enabled: true, mode: "admin-control", adminOnly: true },
  { href: "/icerik/site-kimligi", label: "Site Kimliği", description: "Logo, header kimliği, sayfa etiketi ve footer sloganı", group: "Sayfalar", enabled: true, mode: "admin-control", adminOnly: true },

  { href: "/icerik/medya", label: "Medya Merkezi", description: "Sitedeki görselleri sayfa, kullanım yeri ve koleksiyon bazında yönet", group: "Medya & Eğitim", enabled: true, mode: "controlled-write" },
  { href: "/icerik/egitim", label: "Eğitim Merkezi", description: "Eser türü eğitim sayfaları ve görsel slotları", group: "Medya & Eğitim", enabled: true, mode: "controlled-write" },
  { href: "/icerik/motivasyon", label: "Yazar Motivasyonları", description: "Yazar panelindeki motivasyon ve aktif gün içerikleri", group: "Medya & Eğitim", enabled: true, mode: "controlled-write" },

  { href: "/icerik/yayin-kuyrugu", label: "Yayın Kuyruğu", description: "Bekleyen taslakları incele, önizle ve yayınla", group: "Yayın & Görünürlük", enabled: true, mode: "controlled-write" },
  { href: "/icerik/zamanlama", label: "Yayın Zamanlama", description: "Planlı yayın ve otomatik yayından kaldırma", group: "Yayın & Görünürlük", enabled: true, mode: "controlled-write" },
  { href: "/icerik/seo", label: "SEO", description: "Meta, canonical, index ve sosyal paylaşım denetimi", group: "Yayın & Görünürlük", enabled: true, mode: "read-only-audit" },
  { href: "/icerik/formlar", label: "Formlar & Talepler", description: "Kurumsal formlar ve gelen talepler", group: "Yayın & Görünürlük", enabled: true, mode: "controlled-write" },
  { href: "/icerik/filtreleme-merkezi", label: "Filtreleme Merkezi", description: "Eser/yazar havuzları ve rol filtreleri", group: "Yayın & Görünürlük", enabled: true, mode: "admin-control" },
  { href: "/icerik/yonlendirmeler", label: "Yönlendirmeler", description: "Eski URL ve kalıcı 308 yönlendirme kuralları", group: "Yayın & Görünürlük", enabled: true, mode: "admin-control", adminOnly: true },
  { href: "/icerik/diller", label: "Dil Yönetimi", description: "Public diller ve dil bazlı içerik kapsamı", group: "Yayın & Görünürlük", enabled: true, mode: "admin-control", adminOnly: true },

  { href: "/icerik/hazirlik", label: "Yayın Hazırlığı", description: "CMS canlı içerik hazırlığı ve kabul kontrolü", group: "Yönetim", enabled: true, mode: "controlled-write" },
  { href: "/icerik/saglik", label: "Sistem Sağlığı", description: "Yayın, içerik, SEO ve erişim bütünlük kontrolleri", group: "Yönetim", enabled: true, mode: "read-only-audit" },
  { href: "/icerik/gecmis", label: "Sürüm Geçmişi", description: "Revision karşılaştırma ve güvenli geri yükleme", group: "Yönetim", enabled: true, mode: "controlled-write" },
  { href: "/icerik/erisim", label: "İçerik Yetkileri", description: "İçerik yöneticisi ve yayın yetkileri", group: "Yönetim", enabled: true, mode: "admin-control", adminOnly: true },
  { href: "/icerik/ayarlar", label: "İçerik Ayarları", description: "CMS davranış ve yayın ayarları", group: "Yönetim", enabled: true, mode: "admin-control", adminOnly: true },
];
