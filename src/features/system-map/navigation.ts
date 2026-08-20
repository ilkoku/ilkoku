export type SystemMapWorkspaceKey =
  | "overview"
  | "integrity"
  | "gaps"
  | "workflows"
  | "menus"
  | "api"
  | "actions"
  | "dependencies"
  | "codeData"
  | "infrastructure"
  | "env"
  | "rules"
  | "events"
  | "schema"
  | "external"
  | "architecture"
  | "routes";

export interface SystemMapNavigationItem {
  description: string;
  href: string;
  key: SystemMapWorkspaceKey;
  label: string;
}

export interface SystemMapNavigationGroup {
  items: readonly SystemMapNavigationItem[];
  label: string;
}

export const systemMapNavigationGroups: readonly SystemMapNavigationGroup[] = [
  {
    label: "GENEL",
    items: [
      { key: "overview", href: "/harita", label: "Genel Bakış", description: "Komuta özeti ve tüm çalışma masaları" },
      { key: "integrity", href: "/harita/denetim", label: "Denetim Kapısı", description: "BLOCKER / WARN / PASS ve kanıt kuyruğu" },
      { key: "gaps", href: "/harita/puzzle", label: "Puzzle Boşlukları", description: "Eksik veya riskli operasyon parçaları" },
    ],
  },
  {
    label: "OPERASYON",
    items: [
      { key: "workflows", href: "/harita/akislar", label: "Kanonik Akışlar", description: "Uçtan uca kullanıcı yolculukları" },
      { key: "menus", href: "/harita/menuler", label: "Menü & Rol", description: "Rol menüsü → route doğrulaması" },
      { key: "api", href: "/harita/api", label: "API Güvenliği", description: "HTTP method ve guard kanıtı" },
      { key: "actions", href: "/harita/actions", label: "Server Actions", description: "Action modülleri ve consumer izleri" },
      { key: "dependencies", href: "/harita/bagimliliklar", label: "Bağımlılık Zinciri", description: "Route → import → action → data → API" },
      { key: "codeData", href: "/harita/kod-veri", label: "Kod Veri İzleri", description: "Prisma modeli ve raw SQL kullanan modüller" },
    ],
  },
  {
    label: "RUNTIME / ALTYAPI",
    items: [
      { key: "infrastructure", href: "/harita/altyapi", label: "Altyapı Özeti", description: "Runtime tesisatı ve altyapı boşlukları" },
      { key: "env", href: "/harita/env", label: "ENV Sözleşmesi", description: "Anahtar, runtime ve dokümantasyon durumu" },
      { key: "rules", href: "/harita/yonlendirmeler", label: "Redirect / Rewrite", description: "Yönlendirme ve rewrite zincirleri" },
      { key: "events", href: "/harita/olaylar", label: "Bildirim & E-posta", description: "Olay ve teslimat üreticileri" },
      { key: "schema", href: "/harita/veri", label: "Veri & Migration", description: "Prisma ilişkileri ve migration-only sınırı" },
      { key: "external", href: "/harita/dis-servisler", label: "Dış Referanslar", description: "Kaynak kodda görülen dış domain yüzeyi" },
    ],
  },
  {
    label: "MİMARİ",
    items: [
      { key: "architecture", href: "/harita/mimari", label: "Mimari Sağlık", description: "Sağlık skoru, alanlar ve aksiyon kuyruğu" },
      { key: "routes", href: "/harita/rotalar", label: "Route Envanteri", description: "Tüm route, erişim ve bağlantı detayları" },
    ],
  },
] as const;

export const systemMapNavigationItems = systemMapNavigationGroups.flatMap((group) => group.items);

export function getSystemMapNavigationItem(key: SystemMapWorkspaceKey) {
  return systemMapNavigationItems.find((item) => item.key === key) ?? systemMapNavigationItems[0];
}
