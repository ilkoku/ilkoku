export const PERSONAL_PAGE_POINT_NAVIGATE_EVENT =
  "ilkoku:personal-page-point:navigate";

export type PersonalPagePointAnchor = {
  pageIndex: number;
  x: number;
  y: number;
};

type StoredPersonalPagePointAnchor = PersonalPagePointAnchor & {
  kind: "page_point";
  version: 1;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function serializePersonalPagePointAnchor(
  anchor: PersonalPagePointAnchor,
) {
  const stored: StoredPersonalPagePointAnchor = {
    kind: "page_point",
    pageIndex: Math.max(0, Math.trunc(anchor.pageIndex)),
    version: 1,
    x: clamp01(anchor.x),
    y: clamp01(anchor.y),
  };

  return JSON.stringify(stored);
}

export function parsePersonalPagePointAnchor(
  pathData: string | null,
): PersonalPagePointAnchor | null {
  if (!pathData) return null;

  try {
    const parsed = JSON.parse(pathData) as Partial<StoredPersonalPagePointAnchor>;
    if (
      parsed.kind !== "page_point" ||
      parsed.version !== 1 ||
      !Number.isInteger(parsed.pageIndex) ||
      typeof parsed.x !== "number" ||
      !Number.isFinite(parsed.x) ||
      typeof parsed.y !== "number" ||
      !Number.isFinite(parsed.y)
    ) {
      return null;
    }

    return {
      pageIndex: Math.max(0, parsed.pageIndex as number),
      x: clamp01(parsed.x),
      y: clamp01(parsed.y),
    };
  } catch {
    return null;
  }
}
