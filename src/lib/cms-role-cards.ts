import type { CmsLocaleCode } from "@/lib/cms-locales";
import { cmsLocaleNamespace } from "@/lib/cms-locales";

export const cmsRoleKeys = ["writer", "reader", "editor", "publisher"] as const;
export type CmsRoleKey = (typeof cmsRoleKeys)[number];

export type CmsRoleCard = {
  key: CmsRoleKey;
  title: string;
  description: string;
  ctaLabel: string;
  highlight1: string;
  highlight2: string;
  visible: boolean;
  position: number;
};

export type CmsRoleCardsPayload = Record<string, string>;

export const cmsRoleMeta: Record<CmsRoleKey, { icon: CmsRoleKey; className: string; fixedHref: string }> = {
  writer: { icon: "writer", className: "landing-role--writer", fixedHref: "/kayit?rol=writer" },
  reader: { icon: "reader", className: "landing-role--reader", fixedHref: "/kayit?rol=reader" },
  editor: { icon: "editor", className: "landing-role--editor", fixedHref: "/kayit?rol=editor" },
  publisher: { icon: "publisher", className: "landing-role--publisher", fixedHref: "/kayit?rol=publisher" },
};

const defaults: Record<CmsLocaleCode, Record<CmsRoleKey, Omit<CmsRoleCard, "key">>> = {
  tr: {
    writer: {
      title: "Yazar",
      description: "Eserini bölüm bölüm oluştur, okur geri bildirimiyle geliştir ve profesyonel incelemeye taşı.",
      ctaLabel: "Yazar Ol",
      highlight1: "Bölüm bazlı yayın",
      highlight2: "Eser Pasaportu",
      visible: true,
      position: 1,
    },
    reader: {
      title: "Okuyucu",
      description: "Yeni eserler keşfet, okumaya devam et, favorilerini oluştur ve yazara görüşünü ilet.",
      ctaLabel: "Okuyucu Ol",
      highlight1: "Yeni eser keşfi",
      highlight2: "Bölüm yorumları",
      visible: true,
      position: 2,
    },
    editor: {
      title: "Editör",
      description: "Eserleri bağımsız biçimde incele, profesyonel rapor hazırla ve yazara yol göster.",
      ctaLabel: "Editör Başvurusu",
      highlight1: "Bağımsız inceleme",
      highlight2: "Profesyonel rapor",
      visible: true,
      position: 3,
    },
    publisher: {
      title: "Yayınevi",
      description: "Görünür eserleri ve yazarları keşfet, ilgilendiğin çalışmaları takip alanında topla.",
      ctaLabel: "Yayınevi Başvurusu",
      highlight1: "Eser ve yazar keşfi",
      highlight2: "Kurumsal takip",
      visible: true,
      position: 4,
    },
  },
  en: {
    writer: {
      title: "Writer",
      description: "Create your work chapter by chapter, improve it with reader feedback and move it into professional review.",
      ctaLabel: "Become a Writer",
      highlight1: "Chapter publishing",
      highlight2: "Work Passport",
      visible: true,
      position: 1,
    },
    reader: {
      title: "Reader",
      description: "Discover new works, continue reading, build your favorites and share feedback with writers.",
      ctaLabel: "Become a Reader",
      highlight1: "Work discovery",
      highlight2: "Chapter comments",
      visible: true,
      position: 2,
    },
    editor: {
      title: "Editor",
      description: "Review works independently, prepare professional reports and help writers improve their work.",
      ctaLabel: "Apply as Editor",
      highlight1: "Independent review",
      highlight2: "Professional report",
      visible: true,
      position: 3,
    },
    publisher: {
      title: "Publisher",
      description: "Discover visible works and writers and collect promising projects in your institutional workspace.",
      ctaLabel: "Publisher Application",
      highlight1: "Work and writer discovery",
      highlight2: "Institutional follow-up",
      visible: true,
      position: 4,
    },
  },
};

function fieldName(role: CmsRoleKey, field: string) {
  return `${role}${field}`;
}

export function roleCardsDraftKey(locale: CmsLocaleCode) {
  return `role-cards:${locale}`;
}

export function roleCardsNamespace(locale: CmsLocaleCode) {
  return cmsLocaleNamespace("role_cards", locale);
}

export function roleCardsDefaults(locale: CmsLocaleCode): CmsRoleCard[] {
  return cmsRoleKeys.map((key) => ({ key, ...defaults[locale][key] }));
}

export function serializeRoleCards(cards: CmsRoleCard[]): CmsRoleCardsPayload {
  const payload: CmsRoleCardsPayload = {};
  for (const card of cards) {
    payload[fieldName(card.key, "Title")] = card.title;
    payload[fieldName(card.key, "Description")] = card.description;
    payload[fieldName(card.key, "CtaLabel")] = card.ctaLabel;
    payload[fieldName(card.key, "Highlight1")] = card.highlight1;
    payload[fieldName(card.key, "Highlight2")] = card.highlight2;
    payload[fieldName(card.key, "Visible")] = card.visible ? "true" : "false";
    payload[fieldName(card.key, "Position")] = String(card.position);
  }
  return payload;
}

export function parseCmsRoleCardsPayloadStrict(valueJson: string): CmsRoleCardsPayload | null {
  let value: unknown;
  try {
    value = JSON.parse(valueJson);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const positions = new Set<number>();

  for (const role of cmsRoleKeys) {
    for (const suffix of ["Title", "Description", "CtaLabel", "Highlight1", "Highlight2"] as const) {
      const field = raw[fieldName(role, suffix)];
      if (typeof field !== "string" || !field.trim()) return null;
    }
    const visible = raw[fieldName(role, "Visible")];
    if (visible !== "true" && visible !== "false") return null;
    const positionRaw = raw[fieldName(role, "Position")];
    if (typeof positionRaw !== "string" || !/^[1-4]$/.test(positionRaw)) return null;
    const position = Number(positionRaw);
    if (positions.has(position)) return null;
    positions.add(position);
  }

  if (positions.size !== cmsRoleKeys.length) return null;
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function roleCardsFromPayload(locale: CmsLocaleCode, payload?: CmsRoleCardsPayload | null): CmsRoleCard[] {
  if (!payload) return roleCardsDefaults(locale);
  const serialized = JSON.stringify(payload);
  const strict = parseCmsRoleCardsPayloadStrict(serialized);
  if (!strict) return roleCardsDefaults(locale);

  return cmsRoleKeys
    .map((key) => ({
      key,
      title: strict[fieldName(key, "Title")],
      description: strict[fieldName(key, "Description")],
      ctaLabel: strict[fieldName(key, "CtaLabel")],
      highlight1: strict[fieldName(key, "Highlight1")],
      highlight2: strict[fieldName(key, "Highlight2")],
      visible: strict[fieldName(key, "Visible")] === "true",
      position: Number(strict[fieldName(key, "Position")]),
    }))
    .sort((a, b) => a.position - b.position);
}
