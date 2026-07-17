import type { ChapterStatus, Database } from "@/types/database";

export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type ChapterInsert = Database["public"]["Tables"]["chapters"]["Insert"];
export type ChapterUpdate = Database["public"]["Tables"]["chapters"]["Update"];

export interface ChapterSummary {
  id: string;
  position: number;
  publishedAt: string | null;
  slug: string;
  status: ChapterStatus;
  title: string;
  wordCount: number;
  workId: string;
}
