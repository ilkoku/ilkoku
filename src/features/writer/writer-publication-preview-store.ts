import type { PublishedBookSnapshot } from "@/features/works/book-publication";

let currentPreview: PublishedBookSnapshot | null = null;

export function getWriterBookPublicationPreview() {
  return currentPreview;
}

export function setWriterBookPublicationPreview(
  preview: PublishedBookSnapshot,
) {
  currentPreview = preview;
}

export function clearWriterBookPublicationPreview() {
  currentPreview = null;
}
