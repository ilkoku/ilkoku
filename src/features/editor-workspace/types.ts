import type { StoredWorkContentRating } from "@/lib/work-content-classification";

export type EditorActionState = {
  inviteUrl?: string;
  message: string;
  status: "idle" | "error" | "success";
};

export const initialEditorActionState: EditorActionState = {
  message: "",
  status: "idle",
};

export type EditorWorkCardData = {
  assignedEditorId: string | null;
  authorName: string;
  chapterCount: number;
  contentRating: StoredWorkContentRating;
  coverUrl: string | null;
  editorReviewStatus:
    | "not_requested"
    | "requested"
    | "in_progress"
    | "awaiting_second_editor"
    | "second_in_progress"
    | "completed";
  genre: string | null;
  id: string;
  isFavorite: boolean;
  language: string;
  slug: string;
  title: string;
  totalWords: number;
};

export type EditorWorkTableData = EditorWorkCardData & {
  authorUsername: string | null;
  commentCount: number;
  favoriteCount: number;
  publishedAt: Date | null;
  readerCount: number;
};
