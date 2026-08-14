export type CmsRevisionStatus = "draft" | "published" | "archived";

export type CmsRevisionSnapshot = Record<string, unknown> & {
  locale?: string;
  title?: string;
  status?: CmsRevisionStatus;
  body?: string;
  description?: string;
  updatedLabel?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  noIndex?: boolean;
  _meta?: {
    action?: string;
    restoredFromVersion?: number;
    backupBeforeRestore?: boolean;
  };
};

export type CmsRevisionKind = "legal" | "guide" | "page" | "other";

export function parseCmsRevisionSnapshot(value: string): CmsRevisionSnapshot {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as CmsRevisionSnapshot)
      : {};
  } catch {
    return {};
  }
}

export function cmsRevisionKind(contentKey: string): CmsRevisionKind {
  if (contentKey.startsWith("legal:")) return "legal";
  if (contentKey.startsWith("guide:")) return "guide";
  if (contentKey.startsWith("page:tr:") || contentKey.startsWith("page:en:")) return "page";
  return "other";
}

export function cmsRevisionLocale(contentKey: string, snapshot: CmsRevisionSnapshot) {
  if (snapshot.locale === "en") return "en";
  if (contentKey.startsWith("legal:en:") || contentKey.startsWith("guide:en:") || contentKey.startsWith("page:en:")) return "en";
  return "tr";
}

export function isRestorableCmsRevision(contentKey: string, snapshot: CmsRevisionSnapshot) {
  const kind = cmsRevisionKind(contentKey);
  if (kind !== "legal" && kind !== "guide" && kind !== "page") return false;
  if (typeof snapshot.title !== "string" || typeof snapshot.body !== "string") return false;
  if (!snapshot.title.trim() || !snapshot.body.trim()) return false;
  return snapshot.status === "draft" || snapshot.status === "published" || snapshot.status === "archived";
}

export function cmsRevisionTypeLabel(contentKey: string) {
  const kind = cmsRevisionKind(contentKey);
  if (kind === "legal") return "Yasal Sayfa";
  if (kind === "guide") return "Rehber";
  if (kind === "page") return "Kurumsal Sayfa";
  return "İçerik";
}

export function cmsRevisionStatusLabel(status: unknown) {
  if (status === "published") return "Yayında";
  if (status === "archived") return "Arşiv";
  if (status === "draft") return "Taslak";
  return "Durum kaydı";
}

export type CmsRevisionDiff = {
  key: string;
  label: string;
  before: string;
  after: string;
};

const fieldLabels: Record<string, string> = {
  title: "Başlık",
  description: "Açıklama",
  updatedLabel: "Güncelleme etiketi",
  summary: "Özet",
  body: "İçerik",
  seoTitle: "SEO başlığı",
  seoDescription: "SEO açıklaması",
  noIndex: "Noindex",
  status: "Durum",
};

function displayValue(key: string, value: unknown) {
  if (key === "status") return cmsRevisionStatusLabel(value);
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function diffCmsRevisionSnapshots(
  before: CmsRevisionSnapshot | null,
  after: CmsRevisionSnapshot,
): CmsRevisionDiff[] {
  const keys = [
    "title",
    "description",
    "updatedLabel",
    "summary",
    "body",
    "seoTitle",
    "seoDescription",
    "noIndex",
    "status",
  ];

  return keys.flatMap((key) => {
    const beforeValue = before?.[key];
    const afterValue = after[key];
    if (beforeValue === afterValue) return [];
    if (beforeValue === undefined && afterValue === undefined) return [];
    return [{
      key,
      label: fieldLabels[key] ?? key,
      before: displayValue(key, beforeValue),
      after: displayValue(key, afterValue),
    }];
  });
}
