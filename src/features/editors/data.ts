import type { HumanEditor } from "./types";

// Public editor profiles must represent verified real people only.
// The previous entries were product/demo fixtures and are intentionally
// excluded from the live directory until a verified editor data source is used.
export const editors: readonly HumanEditor[] = [];

export function findEditorBySlug(slug: string) {
  return editors.find((editor) => editor.slug === slug);
}
