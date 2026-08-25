export type WriterStep = "create" | "editor" | "preview" | "success";

export type WorkDraft = {
  title: string;
  genre: string;
  summary: string;
  chapterTitle: string;
  content: string;
  contentClassificationConfirmed: boolean;
  contentRating: WorkContentRating | "";
  contentWarnings: WorkContentWarning[];
};
import type {
  WorkContentRating,
  WorkContentWarning,
} from "@/lib/work-content-classification";
