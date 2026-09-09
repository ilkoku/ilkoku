import {
  bookSectionDetails,
  isSpecialBookSectionKind,
  type SpecialBookSectionKind,
} from "./book-structure";
import {
  parsePublicationLayout,
  type PublicationLayoutSnapshot,
} from "./publication-layout";

export const BOOK_PUBLICATION_LAYOUT_INPUT_NAME = "bookPublicationLayouts";
export const BOOK_PUBLICATION_VERSION = 1 as const;

export type SubmittedBookItemLayout = {
  id: string;
  layout: unknown;
};

export type BookPublicationLayoutSubmission = {
  version: typeof BOOK_PUBLICATION_VERSION;
  items: SubmittedBookItemLayout[];
};

export type PublishedBookChapterItem = {
  type: "chapter";
  structureItemId: string;
  position: number;
  chapterId: string;
  chapterPosition: number;
  title: string;
  subtitle: string;
  content: string;
  layout: PublicationLayoutSnapshot;
};

export type PublishedBookSpecialItem = {
  type: "special";
  structureItemId: string;
  position: number;
  kind: SpecialBookSectionKind;
  title: string;
  subtitle: string;
  content: string;
  layout: PublicationLayoutSnapshot;
};

export type PublishedBookItem =
  | PublishedBookChapterItem
  | PublishedBookSpecialItem;

export type PublishedBookSnapshot = {
  version: typeof BOOK_PUBLICATION_VERSION;
  workTitle: string;
  totalPages: number;
  items: PublishedBookItem[];
};

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function nonEmptyString(value: unknown, maximum = 500_000) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum
    ? value
    : null;
}

function boundedString(value: unknown, maximum = 500_000) {
  return typeof value === "string" && value.length <= maximum ? value : null;
}

export function parseBookPublicationLayoutSubmission(raw: unknown) {
  if (typeof raw !== "string" || !raw.trim()) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.version !== BOOK_PUBLICATION_VERSION) return null;
  if (!Array.isArray(record.items) || record.items.length < 1 || record.items.length > 256) {
    return null;
  }

  const items: SubmittedBookItemLayout[] = [];
  const ids = new Set<string>();

  for (const candidate of record.items) {
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as Record<string, unknown>;
    const id = nonEmptyString(item.id, 128);

    if (!id || ids.has(id) || !item.layout || typeof item.layout !== "object") {
      return null;
    }

    ids.add(id);
    items.push({ id, layout: item.layout });
  }

  return {
    version: BOOK_PUBLICATION_VERSION,
    items,
  } satisfies BookPublicationLayoutSubmission;
}

function parsePublishedItem(value: unknown): PublishedBookItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const type = item.type;
  const structureItemId = nonEmptyString(item.structureItemId, 128);
  const position = positiveInteger(item.position);
  const title = nonEmptyString(item.title, 200);
  const subtitle = boundedString(item.subtitle, 500);
  const content = boundedString(item.content, 500_000);

  if (
    !structureItemId ||
    position === null ||
    !title ||
    subtitle === null ||
    content === null ||
    !item.layout ||
    typeof item.layout !== "object"
  ) {
    return null;
  }

  const layout = parsePublicationLayout(JSON.stringify(item.layout), content);
  if (!layout) return null;

  if (type === "chapter") {
    const chapterId = nonEmptyString(item.chapterId, 128);
    const chapterPosition = positiveInteger(item.chapterPosition);

    if (!chapterId || chapterPosition === null) return null;

    return {
      type: "chapter",
      structureItemId,
      position,
      chapterId,
      chapterPosition,
      title,
      subtitle,
      content,
      layout,
    };
  }

  if (type !== "special") return null;
  const kind = item.kind;
  if (typeof kind !== "string" || !isSpecialBookSectionKind(kind)) return null;

  return {
    type: "special",
    structureItemId,
    position,
    kind,
    title,
    subtitle,
    content,
    layout,
  };
}

export function parsePublishedBookSnapshot(value: unknown): PublishedBookSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Record<string, unknown>;
  if (snapshot.version !== BOOK_PUBLICATION_VERSION) return null;

  const workTitle = nonEmptyString(snapshot.workTitle, 220);
  const totalPages = positiveInteger(snapshot.totalPages);
  if (!workTitle || totalPages === null || !Array.isArray(snapshot.items)) {
    return null;
  }
  if (snapshot.items.length < 1 || snapshot.items.length > 256) return null;

  const items: PublishedBookItem[] = [];
  const ids = new Set<string>();
  const positions = new Set<number>();

  for (const value of snapshot.items) {
    const item = parsePublishedItem(value);
    if (
      !item ||
      ids.has(item.structureItemId) ||
      positions.has(item.position)
    ) {
      return null;
    }
    ids.add(item.structureItemId);
    positions.add(item.position);
    items.push(item);
  }

  items.sort((left, right) => left.position - right.position);
  const calculatedPages = items.reduce(
    (total, item) => total + item.layout.pageEnds.length,
    0,
  );
  if (calculatedPages !== totalPages) return null;

  return {
    version: BOOK_PUBLICATION_VERSION,
    workTitle,
    totalPages,
    items,
  };
}

export function parsePublishedBookFromAuditMetadata(metadata: string | null) {
  if (!metadata) return null;

  try {
    const value = JSON.parse(metadata) as Record<string, unknown>;
    return parsePublishedBookSnapshot(value.bookPublication);
  } catch {
    return null;
  }
}

export function publishedBookItemHref(
  workSlug: string,
  item: PublishedBookItem,
) {
  return item.type === "chapter"
    ? `/oku/${workSlug}/bolum-${item.chapterPosition}`
    : `/oku/${workSlug}/sayfa/${encodeURIComponent(item.structureItemId)}`;
}

export function specialBookPageSubtitle(kind: SpecialBookSectionKind) {
  return bookSectionDetails[kind].description;
}
