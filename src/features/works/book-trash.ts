import type { BookSectionKind } from "./book-structure";

export type BookTrashItem = {
  id: string;
  structureItemId: string;
  chapterId: string | null;
  kind: BookSectionKind;
  title: string;
  content: string;
  originalPosition: number;
  isAutomatic: boolean;
  trashedAt: string;
  wordCount: number;
};
