import { parseCmsRoleCardsPayloadStrict } from "@/lib/cms-role-cards";

export type StrictPageBody = { summary: string; body: string };
export type StrictLegalBody = { description: string; updatedLabel: string; body: string };
export type StrictFaqPayload = {
  id?: string;
  question: string;
  answer: string;
  category?: string;
  audience?: string;
  position?: number;
};

function objectJson(valueJson: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseCmsPageBodyStrict(valueJson: string): StrictPageBody | null {
  const value = objectJson(valueJson);
  if (!value || !nonEmpty(value.body)) return null;
  if (value.summary !== undefined && typeof value.summary !== "string") return null;
  return { summary: stringValue(value.summary), body: stringValue(value.body) };
}

export function parseCmsGuideBodyStrict(valueJson: string): StrictPageBody | null {
  return parseCmsPageBodyStrict(valueJson);
}

export function parseCmsLegalBodyStrict(valueJson: string): StrictLegalBody | null {
  const value = objectJson(valueJson);
  if (!value || !nonEmpty(value.body)) return null;
  if (value.description !== undefined && typeof value.description !== "string") return null;
  if (value.updatedLabel !== undefined && typeof value.updatedLabel !== "string") return null;
  return {
    description: stringValue(value.description),
    updatedLabel: stringValue(value.updatedLabel),
    body: stringValue(value.body),
  };
}

export function parseCmsFaqPayloadStrict(valueJson: string): StrictFaqPayload | null {
  const value = objectJson(valueJson);
  if (!value || !nonEmpty(value.question) || !nonEmpty(value.answer)) return null;
  if (value.id !== undefined && typeof value.id !== "string") return null;
  if (value.category !== undefined && typeof value.category !== "string") return null;
  if (value.audience !== undefined && typeof value.audience !== "string") return null;
  if (value.position !== undefined && typeof value.position !== "number") return null;
  return {
    id: typeof value.id === "string" ? value.id : undefined,
    question: stringValue(value.question),
    answer: stringValue(value.answer),
    category: typeof value.category === "string" ? value.category : undefined,
    audience: typeof value.audience === "string" ? value.audience : undefined,
    position: typeof value.position === "number" ? value.position : undefined,
  };
}

export function parseCmsHomepageSectionStrict(contentKey: string, valueJson: string) {
  const value = objectJson(valueJson);
  if (!value) return null;

  const required = contentKey === "hero"
    ? ["title", "description"]
    : contentKey === "roles"
      ? ["title"]
      : contentKey === "passport"
        ? ["title", "description"]
        : contentKey === "why"
          ? ["title"]
          : contentKey === "history"
            ? ["headerEyebrow", "headerTitleBefore", "headerTitleEmphasis", "headerTitleAfter", "nowEyebrow", "nowTitleLine1", "nowTitleLine2"]
            : contentKey === "footer"
              ? ["slogan"]
              : null;

  if (!required || required.some((key) => !nonEmpty(value[key]))) return null;
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function isCmsContentPagePayloadStrict(contentKey: string, valueJson: string) {
  if (contentKey.startsWith("legal:") && !contentKey.startsWith("legal:en:")) {
    return Boolean(parseCmsLegalBodyStrict(valueJson));
  }
  if (contentKey.startsWith("guide:") && !contentKey.startsWith("guide:en:")) {
    return Boolean(parseCmsGuideBodyStrict(valueJson));
  }
  if (contentKey.startsWith("page:tr:")) {
    return Boolean(parseCmsPageBodyStrict(valueJson));
  }
  return true;
}

export function isCmsStagedPayloadStrict(contentKey: string, payload: Record<string, unknown>) {
  const serialized = JSON.stringify(payload);

  if (contentKey.startsWith("homepage:")) {
    const parts = contentKey.split(":");
    const section = parts.slice(2).join(":");
    return Boolean(parseCmsHomepageSectionStrict(section, serialized));
  }
  if (contentKey.startsWith("role-cards:")) {
    return Boolean(parseCmsRoleCardsPayloadStrict(serialized));
  }
  if (contentKey.startsWith("faq:")) {
    return Boolean(parseCmsFaqPayloadStrict(serialized));
  }
  if (contentKey.startsWith("page:")) {
    return nonEmpty(payload.title) && nonEmpty(payload.body);
  }
  return true;
}
