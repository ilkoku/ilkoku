import type { PublishedBookSnapshot } from "@/features/works/book-publication";

export type WriterBookPublicationPreview = PublishedBookSnapshot & {
  coverUrl: string | null;
};

let currentPreview: WriterBookPublicationPreview | null = null;

export function getWriterBookPublicationPreview() {
  return currentPreview;
}

export function setWriterBookPublicationPreview(
  preview: WriterBookPublicationPreview,
) {
  currentPreview = preview;
}

export function clearWriterBookPublicationPreview() {
  currentPreview = null;
}
