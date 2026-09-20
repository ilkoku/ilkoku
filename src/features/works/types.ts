import type { Prisma } from "@/generated/prisma/client";
import type { ChapterModel } from "@/generated/prisma/models/Chapter";
import type { WorkModel } from "@/generated/prisma/models/Work";
import type { PublishedBookSnapshot } from "./book-publication";
import type { PublicationLayoutSnapshot } from "./publication-layout";

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
  formatting?: string;
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

export type PublicWorkCommerceState = {
  chapterAccess: Record<string, "preview" | "locked">;
  currency: string;
  enforcementActive: boolean;
  hasEntitlement: boolean;
  priceAmount: bigint | null;
  saleModel: "free" | "paid";
  saleStatus: "draft" | "ready" | "active" | "paused";
};

export type PublicWorkDetail =
  WorkModel & {
    authorName: string;
    authorPublicId: string;
    chapterCount: number;
    chapters: ChapterModel[];
    commerce?: PublicWorkCommerceState;
    isCompleted: boolean;
    publicationBook: PublishedBookSnapshot | null;
    sameAuthorWorks: PublicWorkSummary[];
    similarWorks: PublicWorkSummary[];
  };

export type PublicWorkSummary = Pick<
  WorkModel,
  "editorReviewStatus" | "genre" | "id" | "slug" | "title"
> & {
  authorName: string;
  chapterCount: number;
};

export type PublicChapterDetail =
  ChapterModel & {
    formatting: string;
    publicationLayout: PublicationLayoutSnapshot | null;
    publicationVersion: number | null;
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
