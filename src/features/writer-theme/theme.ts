export type WriterThemeKey =
  | "pageCanvas"
  | "sidebar"
  | "brandSurface"
  | "mainSurface"
  | "headerSurface"
  | "cardSurface"
  | "coverSurface"
  | "controlSurface"
  | "border"
  | "text"
  | "textMuted"
  | "heading"
  | "navText"
  | "navMuted"
  | "activeNav"
  | "activeNavSurface"
  | "hover"
  | "primary"
  | "primaryHover"
  | "buttonText"
  | "accent"
  | "coverText"
  | "progressTrack";

export type WriterTheme = Record<WriterThemeKey, string>;

export const defaultWriterTheme: WriterTheme = {
  pageCanvas: "#F8F6FF",
  sidebar: "#F8F6FF",
  brandSurface: "#F8F6FF",
  mainSurface: "#F8F6FF",
  headerSurface: "#F8F6FF",
  cardSurface: "#FFFEFB",
  coverSurface: "#FFFEFB",
  controlSurface: "#F8F6FF",
  border: "#D9D0FA",
  text: "#292620",
  textMuted: "#746F66",
  heading: "#292620",
  navText: "#4D4942",
  navMuted: "#9B958B",
  activeNav: "#6847E8",
  activeNavSurface: "#EDE9FF",
  hover: "#EDE9FF",
  primary: "#6847E8",
  primaryHover: "#4B2DBF",
  buttonText: "#FFFFFF",
  accent: "#8065F2",
  coverText: "#292620",
  progressTrack: "#ECE7DF",
};

export const writerThemePaletteGroups = [
  {
    label: "İlkOku ve nötr",
    colors: [
      "#F8F6FF",
      "#EDE9FF",
      "#FFFFFF",
      "#FFFEFB",
      "#ECE7DF",
      "#D9D0FA",
      "#D1D5DB",
      "#9CA3AF",
      "#746F66",
      "#4D4942",
      "#292620",
      "#111827",
      "#000000",
    ],
  },
  {
    label: "Mor ve lila",
    colors: [
      "#F3E8FF",
      "#E9D5FF",
      "#D8B4FE",
      "#C084FC",
      "#A855F7",
      "#9333EA",
      "#8065F2",
      "#6847E8",
      "#5B38D1",
      "#4B2DBF",
      "#3B1D9A",
    ],
  },
  {
    label: "Mavi",
    colors: [
      "#DBEAFE",
      "#BFDBFE",
      "#93C5FD",
      "#60A5FA",
      "#3B82F6",
      "#2563EB",
      "#1D4ED8",
      "#1E3A8A",
    ],
  },
  {
    label: "Turkuaz ve petrol",
    colors: [
      "#CFFAFE",
      "#67E8F9",
      "#06B6D4",
      "#0891B2",
      "#CCFBF1",
      "#5EEAD4",
      "#14B8A6",
      "#0F766E",
    ],
  },
  {
    label: "Yeşil",
    colors: [
      "#DCFCE7",
      "#86EFAC",
      "#4ADE80",
      "#22C55E",
      "#16A34A",
      "#166534",
    ],
  },
  {
    label: "Sarı ve turuncu",
    colors: [
      "#FEF9C3",
      "#FDE047",
      "#EAB308",
      "#FFF7ED",
      "#FDBA74",
      "#F97316",
      "#C2410C",
    ],
  },
  {
    label: "Kırmızı ve pembe",
    colors: [
      "#FEE2E2",
      "#FCA5A5",
      "#EF4444",
      "#B91C1C",
      "#FCE7F3",
      "#F9A8D4",
      "#EC4899",
      "#BE185D",
    ],
  },
] as const;

export const writerThemePalette = writerThemePaletteGroups.flatMap((group) => [...group.colors]);

export const writerThemeLayers: Array<{
  key: WriterThemeKey;
  label: string;
  description: string;
}> = [
  { key: "pageCanvas", label: "1. Genel sayfa zemini", description: "En dip katman; tüm çalışma alanının ana tuvali." },
  { key: "sidebar", label: "2. Sol menü zemini", description: "Yazar menüsünün ana arka planı." },
  { key: "brandSurface", label: "3. Logo alanı zemini", description: "Sol menüde mevcut İlkOku logosunu çevreleyen alan." },
  { key: "mainSurface", label: "4. Ana içerik zemini", description: "Sidebar dışındaki ana çalışma alanı." },
  { key: "headerSurface", label: "5. Üst bar zemini", description: "Yazar çalışma alanının üst başlık / kullanıcı barı." },
  { key: "cardSurface", label: "6. Kart ve panel yüzeyi", description: "Kartlar, hero alanları ve açılır paneller." },
  { key: "coverSurface", label: "7. Eser kapağı zemini", description: "Eser kartlarında ve çalışma alanında görünen kapak yüzeyi." },
  { key: "controlSurface", label: "8. Form ve araç yüzeyi", description: "Input, select, sekme, toolbar ve ikincil kontroller." },
  { key: "border", label: "9. Kenarlıklar", description: "Kart, menü ve kontrol ayırıcılarının rengi." },
  { key: "text", label: "10. Ana metin", description: "Normal içerik metinlerinin ana rengi." },
  { key: "textMuted", label: "11. İkincil metin", description: "Açıklama, tarih ve yardımcı metinler." },
  { key: "heading", label: "12. Başlıklar", description: "Sayfa ve kart başlıklarının ana rengi." },
  { key: "navText", label: "13. Menü yazıları", description: "Aktif olmayan sol menü öğelerinin yazı rengi." },
  { key: "navMuted", label: "14. Menü yardımcı yazıları", description: "Menü bölüm başlıkları ve sürüm gibi ikincil metinler." },
  { key: "activeNav", label: "15. Aktif menü yazısı / işareti", description: "Seçili sol menü öğesinin yazısı ve göstergesi." },
  { key: "activeNavSurface", label: "16. Aktif menü zemini", description: "Seçili sol menü öğesinin arka plan rengi." },
  { key: "hover", label: "17. Hover yüzeyi", description: "Fareyle üzerine gelinen açık vurgu yüzeyi." },
  { key: "primary", label: "18. Ana buton / vurgu", description: "Birincil aksiyonlar ve ana vurgu rengi." },
  { key: "primaryHover", label: "19. Buton hover", description: "Birincil aksiyonların hover / güçlü tonu." },
  { key: "buttonText", label: "20. Ana buton yazısı", description: "Birincil butonların üzerindeki metin rengi." },
  { key: "accent", label: "21. Accent", description: "Badge, progress ve ikincil vurgu rengi." },
  { key: "coverText", label: "22. Eser kapağı yazısı", description: "Eser kapağı üzerindeki başlık ve metinlerin ana rengi." },
  { key: "progressTrack", label: "23. Progress zemini", description: "İlerleme çubuklarının en alttaki ray rengi." },
];

export function writerThemeStorageKey(userId: string) {
  return `ilkoku:writer-theme:${userId}`;
}

export function normalizeHex(value: string) {
  const trimmed = value.trim().toUpperCase();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (/^#[0-9A-F]{6}$/.test(withHash)) return withHash;
  if (/^#[0-9A-F]{3}$/.test(withHash)) {
    return `#${withHash
      .slice(1)
      .split("")
      .map((part) => `${part}${part}`)
      .join("")}`;
  }

  return null;
}

export function sanitizeWriterTheme(value: unknown): WriterTheme {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const next = { ...defaultWriterTheme };

  for (const key of Object.keys(defaultWriterTheme) as WriterThemeKey[]) {
    const candidate = typeof source[key] === "string" ? normalizeHex(source[key] as string) : null;
    if (candidate) next[key] = candidate;
  }

  return next;
}
