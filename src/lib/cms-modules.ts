export type CmsModuleMode = "controlled-write" | "read-only-audit" | "admin-control";

export type CmsModule = {
  href: string;
  label: string;
  description: string;
  group: "Site" | "İçerik" | "Büyüme" | "Sistem";
  enabled: boolean;
  mode: CmsModuleMode;
  adminOnly?: boolean;
};

export const cmsModules: CmsModule[] = [
  { href: "/icerik", label: "Genel Bakış", description: "İçerik yönetimi özeti ve operasyon öncelikleri", group: "Site", enabled: true, mode: "read-only-audit" },
  { href: "/icerik/arama", label: "İçerik Ara", description: "CMS içeriklerinde hızlı arama ve doğrudan erişim", group: "Site", enabled: true, mode: "read-only-audit" },
  { href: "/icerik/ana-sayfa", label: "Ana Sayfa", description: "Hero, bölümler, CTA ve footer", group: "Site", enabled: true, mode: "controlled-write" },
  { href: "/icerik/ana-sayfa/history", label: "Ana Sayfa → History", description: "History 1–15 içerik parçaları; geometri kodda kilitli", group: "Site", enabled: true, mode: "controlled-write" },
  { href: "/icerik/rol-kartlari", label: "Rol Kartları", description: "Yazar, Okuyucu, Editör ve Yayınevi kartları", group: "Site", enabled: true, mode: "controlled-write" },
  { href: "/icerik/sayfalar", label: "Güven & Kurum Sayfaları", description: "Nasıl Çalışır ve diğer kamuya açık güven/kurum sayfaları", group: "Site", enabled: true, mode: "controlled-write" },
  { href: "/icerik/menuler", label: "Menüler & Footer", description: "Navigasyon, linkler ve footer alanları", group: "Site", enabled: true, mode: "admin-control", adminOnly: true },
  { href: "/icerik/yasal", label: "Yasal Sayfalar", description: "KVKK, gizlilik, çerez ve telif metinleri", group: "Site", enabled: true, mode: "controlled-write" },
  { href: "/icerik/medya", label: "Medya", description: "Görseller, dosyalar, kullanım yerleri ve alt metinler", group: "İçerik", enabled: true, mode: "controlled-write" },
  { href: "/icerik/sss", label: "SSS & Yardım", description: "Rol bazlı yardım ve sık sorulan sorular", group: "İçerik", enabled: true, mode: "controlled-write" },
  { href: "/icerik/duyurular", label: "Duyurular", description: "Platform ve bakım duyuruları", group: "İçerik", enabled: true, mode: "controlled-write" },
  { href: "/icerik/filtreleme-merkezi", label: "Filtreleme Merkezi", description: "Eser/Yazar havuzları, rol filtreleri ve yetkili filtre ekle/çıkar yönetimi", group: "İçerik", enabled: true, mode: "admin-control" },
  { href: "/icerik/yayin-kuyrugu", label: "Yayın Kuyruğu", description: "Bekleyen taslakları önizleme, inceleme ve yayınlama", group: "İçerik", enabled: true, mode: "controlled-write" },
  { href: "/icerik/zamanlama", label: "Yayın Zamanlama", description: "Planlı yayın ve otomatik yayından kaldırma", group: "İçerik", enabled: true, mode: "controlled-write" },
  { href: "/icerik/seo", label: "SEO", description: "Meta, canonical, index ve sosyal paylaşım denetimi", group: "Büyüme", enabled: true, mode: "read-only-audit" },
  { href: "/icerik/formlar", label: "Formlar & Talepler", description: "Kurumsal formlar ve kontrollü talep iş akışı", group: "Büyüme", enabled: true, mode: "controlled-write" },
  { href: "/icerik/yonlendirmeler", label: "Yönlendirmeler", description: "Eski URL ve kalıcı 308 yönlendirme kuralları", group: "Büyüme", enabled: true, mode: "admin-control", adminOnly: true },
  { href: "/icerik/diller", label: "Dil Yönetimi", description: "Public diller ve dil bazlı içerik kapsamı", group: "Büyüme", enabled: true, mode: "admin-control", adminOnly: true },
  { href: "/icerik/hazirlik", label: "Yayın Hazırlığı", description: "CMS canlı içerik hazırlığı ve kabul kontrolü", group: "Sistem", enabled: true, mode: "controlled-write" },
  { href: "/icerik/saglik", label: "Sistem Sağlığı", description: "CMS yayın, içerik, SEO ve erişim bütünlük kontrolleri", group: "Sistem", enabled: true, mode: "read-only-audit" },
  { href: "/icerik/gecmis", label: "Sürüm Geçmişi", description: "Revision karşılaştırma ve güvenli geri yükleme", group: "Sistem", enabled: true, mode: "controlled-write" },
  { href: "/icerik/erisim", label: "İçerik Yetkileri", description: "İçerik yöneticisi ve yayın yetkileri", group: "Sistem", enabled: true, mode: "admin-control", adminOnly: true },
  { href: "/icerik/ayarlar", label: "İçerik Ayarları", description: "CMS davranış ve yayın ayarları", group: "Sistem", enabled: true, mode: "admin-control", adminOnly: true },
];
