export type WriterThemeKey =
  | "pageCanvas"
  | "sidebar"
  | "mainSurface"
  | "cardSurface"
  | "controlSurface"
  | "border"
  | "text"
  | "textMuted"
  | "heading"
  | "activeNav"
  | "hover"
  | "primary"
  | "primaryHover"
  | "accent"
  | "progressTrack";

export type WriterTheme = Record<WriterThemeKey, string>;

export const defaultWriterTheme: WriterTheme = {
  pageCanvas: "#F8F6FF",
  sidebar: "#F8F6FF",
  mainSurface: "#F8F6FF",
  cardSurface: "#FFFEFB",
  controlSurface: "#F8F6FF",
  border: "#D9D0FA",
  text: "#292620",
  textMuted: "#746F66",
  heading: "#292620",
  activeNav: "#6847E8",
  hover: "#EDE9FF",
  primary: "#6847E8",
  primaryHover: "#4B2DBF",
  accent: "#8065F2",
  progressTrack: "#ECE7DF",
};

export const writerThemePalette = [
  "#F8F6FF",
  "#EDE9FF",
  "#FFFFFF",
  "#FFFEFB",
  "#ECE7DF",
  "#D9D0FA",
  "#746F66",
  "#292620",
  "#6847E8",
  "#8065F2",
  "#4B2DBF",
  "#5B38D1",
] as const;

export const writerThemeLayers: Array<{
  key: WriterThemeKey;
  label: string;
  description: string;
}> = [
  { key: "pageCanvas", label: "1. Genel sayfa zemini", description: "En dip katman; tüm çalışma alanının ana tuvali." },
  { key: "sidebar", label: "2. Sol menü zemini", description: "Logo ve yazar menüsünün arka planı." },
  { key: "mainSurface", label: "3. Ana içerik zemini", description: "Sidebar dışındaki ana çalışma alanı." },
  { key: "cardSurface", label: "4. Kart ve panel yüzeyi", description: "Kartlar, hero alanları ve açılır paneller." },
  { key: "controlSurface", label: "5. Form ve araç yüzeyi", description: "Input, select, sekme, toolbar ve ikincil kontroller." },
  { key: "border", label: "6. Kenarlıklar", description: "Kart, menü ve kontrol ayırıcılarının rengi." },
  { key: "text", label: "7. Ana metin", description: "Normal içerik ve menü metinleri." },
  { key: "textMuted", label: "8. İkincil metin", description: "Açıklama, tarih ve yardımcı metinler." },
  { key: "heading", label: "9. Başlıklar", description: "Sayfa ve kart başlıklarının ana rengi." },
  { key: "activeNav", label: "10. Aktif menü", description: "Seçili sol menü öğesi ve göstergesi." },
  { key: "hover", label: "11. Hover yüzeyi", description: "Fareyle üzerine gelinen açık vurgu yüzeyi." },
  { key: "primary", label: "12. Ana buton / vurgu", description: "Birincil aksiyonlar ve ana vurgu rengi." },
  { key: "primaryHover", label: "13. Buton hover", description: "Birincil aksiyonların hover / güçlü tonu." },
  { key: "accent", label: "14. Accent", description: "Badge, progress ve ikincil mor vurgu." },
  { key: "progressTrack", label: "15. Progress zemini", description: "İlerleme çubuklarının en alttaki ray rengi." },
];

export function writerThemeStorageKey(userId: string) {
  return `ilkoku:writer-theme:${userId}`;
}

export function normalizeHex(value: string) {
  const trimmed = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(trimmed)) return trimmed;
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
