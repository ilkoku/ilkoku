export type ReadingDisplayMode = "scroll" | "paged";

export const READING_DISPLAY_MODE_STORAGE_KEY =
  "ilkoku:reading-display-mode:v1";

export const READING_DISPLAY_MODE_EVENT =
  "ilkoku:reading-display-mode";

export const READING_PAGE_PROGRESS_EVENT =
  "ilkoku:reading-page-progress";

export function isReadingDisplayMode(
  value: unknown,
): value is ReadingDisplayMode {
  return value === "scroll" || value === "paged";
}
