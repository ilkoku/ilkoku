export type WriterStep = "create" | "editor" | "preview" | "success";

export type WorkDraft = {
  title: string;
  genre: string;
  summary: string;
  chapterTitle: string;
  content: string;
};
