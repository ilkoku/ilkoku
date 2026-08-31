export const PERSONAL_ANNOTATION_TYPES = [
  "highlight",
  "underline",
  "pin",
  "reading_position",
  "note",
  "drawing",
] as const;

export type PersonalAnnotationType =
  (typeof PERSONAL_ANNOTATION_TYPES)[number];

export type PersonalAnnotationRecord = {
  anchorVersion: number;
  chapterId: string;
  createdAt: string;
  endOffset: number | null;
  id: string;
  note: string | null;
  paragraphIndex: number | null;
  pathData: string | null;
  selectedText: string | null;
  startOffset: number | null;
  type: PersonalAnnotationType;
  updatedAt: string;
  workId: string;
};

export type PersonalDrawingPoint = {
  x: number;
  y: number;
};

export type PersonalTextAnchor = {
  endOffset: number;
  paragraphIndex: number;
  selectedText: string;
  startOffset: number;
};
