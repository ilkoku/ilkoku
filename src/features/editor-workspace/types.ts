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
  coverUrl: string | null;
  editorReviewStatus:
    | "not_requested"
    | "requested"
    | "in_progress"
    | "completed";
  genre: string | null;
  id: string;
  isFavorite: boolean;
  language: string;
  slug: string;
  title: string;
  totalWords: number;
};
