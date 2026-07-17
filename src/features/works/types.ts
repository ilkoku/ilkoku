import type { Database, WorkStatus, WorkType } from "@/types/database";

export type Work = Database["public"]["Tables"]["works"]["Row"];
export type WorkInsert = Database["public"]["Tables"]["works"]["Insert"];
export type WorkUpdate = Database["public"]["Tables"]["works"]["Update"];

export interface WorkSummary {
  authorId: string;
  coverUrl: string | null;
  genre: string;
  id: string;
  isPublic: boolean;
  slug: string;
  status: WorkStatus;
  title: string;
  type: WorkType;
  updatedAt: string;
}

export type WorkWithChapterSummary = Work & {
  chapterCount: number;
  latestChapter: {
    content: string;
    id: string;
    position: number;
    slug: string;
    status: Database["public"]["Tables"]["chapters"]["Row"]["status"];
    title: string;
    updatedAt: string;
    wordCount: number;
  } | null;
  totalWords: number;
};

export type PublicWorkDetail = Work & {
  authorName: string;
  chapterCount: number;
};

export type PublicChapterDetail = Database["public"]["Tables"]["chapters"]["Row"] & {
  work: PublicWorkDetail;
};

export type WorkActionStatus = "idle" | "error" | "success";

export interface WorkActionState {
  chapterId?: string;
  message: string;
  status: WorkActionStatus;
  workId?: string;
  workSlug?: string;
}

export const initialWorkActionState: WorkActionState = {
  message: "",
  status: "idle",
};
