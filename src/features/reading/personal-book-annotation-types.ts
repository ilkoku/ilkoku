export const PERSONAL_BOOK_ANNOTATION_TYPES = [
  "highlight",
  "underline",
  "pin",
  "reading_position",
  "note",
] as const;

export type PersonalBookAnnotationType =
  (typeof PERSONAL_BOOK_ANNOTATION_TYPES)[number];

export type PersonalBookAnnotationRecord = {
  anchorVersion: number;
  createdAt: string;
  endOffset: number | null;
  id: string;
  note: string | null;
  pathData: string | null;
  publicationItemId: string;
  selectedText: string | null;
  startOffset: number | null;
  type: PersonalBookAnnotationType;
  updatedAt: string;
  workId: string;
};

export type PersonalBookTextAnchor = {
  endOffset: number;
  selectedText: string;
  startOffset: number;
};
