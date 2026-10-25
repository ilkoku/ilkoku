import { cmsModules } from "@/lib/cms-modules";
import { systemMapNavigationItems } from "@/features/system-map/navigation";

export type AdminNavSubItem = { href: string; label: string };

export type AdminNavItem = {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "users"
    | "works"
    | "authors"
    | "editors"
    | "publishers"
    | "readers"
    | "comments"
    | "applications"
    | "audit"
    | "email"
    | "settings";
  badge?: string;
  children?: readonly AdminNavSubItem[];
};

export type AdminNavGroup = {
  id:
    | "overview"
    | "people"
    | "content"
    | "commerce"
    | "communications"
    | "security"
    | "archive";
  label: string;
  description: string;
  icon: AdminNavItem["icon"];
  landingHref: string;
  items: readonly AdminNavItem[];
};

export const SYSTEM_MANAGEMENT_PATH = "/sistem-yonetimi";

function systemPath(path = "") {
  return `${SYSTEM_MANAGEMENT_PATH}${path}`;
}


/* Reuse existing labels and real routes. No page, CMS, or system-map styles change. */
const contentSubNavigation: readonly AdminNavSubItem[] = [
  ...cmsModules.filter((module) => module.enabled && module.showInNavigation !== false).map(({ href, label }) => ({ href, label })),
  { href: "/icerik/rehber", label: "Rehber & İçerikler" },
];

const paymentSubNavigation: readonly AdminNavSubItem[] = [
  { href: "/sistem-yonetimi/odeme-sistemi/siparisler", label: "Siparişler" },
  { href: "/sistem-yonetimi/odeme-sistemi/odemeler", label: "Ödemeler" },
  { href: "/sistem-yonetimi/odeme-sistemi/iadeler", label: "İadeler" },
  { href: "/sistem-yonetimi/odeme-sistemi/erisim-haklari", label: "Erişim Hakları" },
  { href: "/sistem-yonetimi/odeme-sistemi/kuponlar", label: "Kuponlar" },
  { href: "/sistem-yonetimi/odeme-sistemi/satici-yetkileri", label: "Satıcı & Satış Yetkisi" },
  { href: "/sistem-yonetimi/odeme-sistemi/saglayicilar", label: "Ödeme Sağlayıcıları" },
  { href: "/sistem-yonetimi/odeme-sistemi/ayarlar", label: "Commerce Ayarları" },
];

const financeSubNavigation: readonly AdminNavSubItem[] = [
  { href: "/sistem-yonetimi/finans-gelirler/finans-hareketleri", label: "Finans Hareketleri" },
  { href: "/sistem-yonetimi/finans-gelirler/ilkoku-gelirleri", label: "İlkOku Gelirleri" },
  { href: "/sistem-yonetimi/finans-gelirler/kampanya-maliyetleri", label: "Kampanya Maliyetleri" },
  { href: "/sistem-yonetimi/finans-gelirler/mutabakat", label: "Mutabakat" },
  { href: "/sistem-yonetimi/finans-gelirler/yazar-bakiyeleri", label: "Yazar Bakiyeleri" },
  { href: "/sistem-yonetimi/finans-gelirler/yazar-hakedisleri", label: "Yazar Hakedişleri" },
  { href: "/sistem-yonetimi/finans-gelirler/yazar-odemeleri", label: "Yazar Ödemeleri" },
];

const contractSubNavigation: readonly AdminNavSubItem[] = [
  { href: "/sozlesme", label: "Genel Bakış" },
  { href: "/sozlesme/takip", label: "Takip Merkezi" },
  { href: "/sozlesme/bildirimler", label: "Bildirimler" },
  { href: "/sozlesme/taslaklar", label: "Soft Taslaklar" },
  { href: "/sozlesme/sablonlar", label: "Şablon Kütüphanesi" },
  { href: "/sozlesme/inceleme", label: "İnceleme Masası" },
  { href: "/sozlesme/hukuk-inceleme", label: "Hukukçu Paketi" },
  { href: "/sozlesme/sablonlar/yeni", label: "Yeni Şablon" },
];

const powerSeoSubNavigation: readonly AdminNavSubItem[] = [
  { href: "/sistem-yonetimi/power-seo", label: "Genel Bakış" },
  { href: "/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links", label: "Tam Site ve HTTP" },
  { href: "/sistem-yonetimi/power-seo?sekme=sayfa", label: "Sayfa Denetimi" },
  { href: "/sistem-yonetimi/power-seo?sekme=servisler", label: "GSC ve API Bağlantıları" },
  { href: "/sistem-yonetimi/power-seo?sekme=teknik", label: "Teknik Modüller" },
];

const systemMapSubNavigation: readonly AdminNavSubItem[] =
  systemMapNavigationItems.map(({ href, label }) => ({ href, label }));

export const adminNavigationGroups: readonly AdminNavGroup[] = [
  {
    id: "overview",
    label: "Genel Bakış",
    description: "Platform özeti ve ana yönetim ekranı",
    icon: "dashboard",
    landingHref: systemPath(),
    items: [
      { href: systemPath(), label: "Kontrol Merkezi", icon: "dashboard" },
    ],
  },
  {
    id: "people",
    label: "Kullanıcı & Roller",
    description: "Üyeler, roller, başvurular ve topluluk",
    icon: "users",
    landingHref: systemPath("/kullanicilar"),
    items: [
      { href: systemPath("/kullanicilar"), label: "Kullanıcılar", icon: "users" },
      { href: systemPath("/yazarlar"), label: "Yazarlar", icon: "authors" },
      { href: systemPath("/editorler"), label: "Editörler", icon: "editors" },
      { href: systemPath("/yayinevleri"), label: "Yayınevleri", icon: "publishers" },
      { href: systemPath("/okuyucular"), label: "Okuyucular", icon: "readers" },
      { href: systemPath("/basvurular"), label: "Başvurular", icon: "applications" },
      { href: systemPath("/roller"), label: "Rol ve Yetkiler", icon: "settings" },
      { href: systemPath("/yorumlar"), label: "Yorumlar", icon: "comments" },
    ],
  },
  {
    id: "content",
    label: "Eser & İçerik",
    description: "Eserler, CMS ve kitap veri alanları",
    icon: "works",
    landingHref: systemPath("/eserler"),
    items: [
      { href: systemPath("/eserler"), label: "Eserler", icon: "works" },
      { href: "/icerik", label: "İçerik Yönetimi", icon: "works", children: contentSubNavigation },
      { href: systemPath("/kitap-endeksi"), label: "Kitap Endeksi", icon: "works" },
    ],
  },
  {
    id: "commerce",
    label: "Ticaret & Finans",
    description: "Ödeme, gelir ve finans operasyonları",
    icon: "applications",
    landingHref: systemPath("/odeme-sistemi"),
    items: [
      { href: systemPath("/odeme-sistemi"), label: "Ödeme Sistemi", icon: "applications", children: paymentSubNavigation },
      { href: systemPath("/finans-gelirler"), label: "Finans & Gelirler", icon: "audit", children: financeSubNavigation },
    ],
  },
  {
    id: "communications",
    label: "İletişim & Sözleşmeler",
    description: "Sözleşme ve e-posta operasyonları",
    icon: "email",
    landingHref: "/sozlesme",
    items: [
      { href: "/sozlesme", label: "Sözleşme Yönetimi", icon: "applications", children: contractSubNavigation },
      { href: systemPath("/epostalar"), label: "E-postalar", icon: "email" },
      { href: systemPath("/eposta-operasyonlari"), label: "E-posta Operasyonları", icon: "email" },
    ],
  },
  {
    id: "security",
    label: "Güvenlik & Sistem",
    description: "Sistem sağlığı, denetim ve güvenlik",
    icon: "audit",
    landingHref: "/harita",
    items: [
      { href: "/harita", label: "Sistem Haritası", icon: "audit", children: systemMapSubNavigation },
      { href: systemPath("/power-seo"), label: "Power-SEO", icon: "audit", children: powerSeoSubNavigation },
      { href: systemPath("/okuma-guvenligi"), label: "Okuma Güvenliği", icon: "audit" },
      { href: systemPath("/audit-log"), label: "Audit Log", icon: "audit" },
    ],
  },
  {
    id: "archive",
    label: "Arşiv & Ayarlar",
    description: "Arşiv, silme, demo verisi ve sistem ayarları",
    icon: "settings",
    landingHref: systemPath("/arsiv"),
    items: [
      { href: systemPath("/arsiv"), label: "Arşiv Merkezi", icon: "audit" },
      { href: systemPath("/silme-merkezi"), label: "Silme Merkezi", icon: "audit" },
      { href: systemPath("/demo"), label: "Demo Veri Merkezi", icon: "applications" },
      { href: systemPath("/ayarlar"), label: "Ayarlar", icon: "settings" },
    ],
  },
] as const;

export const adminNavigation: AdminNavItem[] = adminNavigationGroups.flatMap(
  (group) => [...group.items],
);
