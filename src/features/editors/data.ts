import { editorsContent } from "@/content";
import type { HumanEditor } from "./types";

export const editors: readonly HumanEditor[] = editorsContent.data.map((editor) => ({
  ...editor,
  specialties: [...editor.specialties],
  genres: [...editor.genres],
  sampleTopics: [...editor.sampleTopics],
  authorReviews: editor.authorReviews.map((review) => ({ ...review })),
}));

export function findEditorBySlug(slug: string) {
  return editors.find((editor) => editor.slug === slug);
}
