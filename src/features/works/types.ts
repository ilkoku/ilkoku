import type { Prisma } from "@/generated/prisma/client";
import type { ChapterModel } from "@/generated/prisma/models/Chapter";
import type { WorkModel } from "@/generated/prisma/models/Work";

export type Work = WorkModel;

export type WorkInsert =
  Prisma.WorkUncheckedCreateInput;

export type WorkUpdate =
  Prisma.WorkUncheckedUpdateInput;

export interface WorkSummary {
  authorId: WorkModel["authorId"];
  coverUrl: WorkModel["coverUrl"];
  description: WorkModel["description"];
  genre: WorkModel["genre"];
  id: WorkModel["id"];
  language: WorkModel["language"];
  slug: WorkModel["slug"];
  status: WorkModel["status"];
  title: WorkModel["title"];
  updatedAt: WorkModel["updatedAt"];
  visibility: WorkModel["visibility"];
}

export type ChapterSummary = {
  content: ChapterModel["content"];
  id: ChapterModel["id"];
  position: ChapterModel["position"];
  slug: string;
  status: ChapterModel["status"];
  title: ChapterModel["title"];
  updatedAt: string;
  wordCount: number;
};

export type WorkWithChapterSummary =
  WorkModel & {
    chapterCount: number;
    chapters: ChapterSummary[];
    latestChapter: ChapterSummary | null;
    totalWords: number;
  };

export type PublicWorkDetail =
  WorkModel & {
    authorName: string;
    chapterCount: number;
  };

export type PublicChapterDetail =
  ChapterModel & {
    work: PublicWorkDetail;
  };

export type WorkActionStatus =
  | "idle"
  | "error"
  | "success";

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