import type { PublishedBookItem } from "@/features/works/book-publication";

export type ReaderFacingPagePreview = {
  itemId: string;
  localIndex: number;
  text: string;
};

/**
 * A reader may see only the active publication item's complete text.
 * The two neighbouring items contribute at most one facing physical page each.
 * Page ends, section order and author formatting remain immutable.
 *
 * Input items must already have passed the member/commerce redaction query.
 */
export function buildReaderBookOutline(
  items: PublishedBookItem[] | null | undefined,
  activeItemId: string | null | undefined,
) {
  if (!items?.length || !activeItemId) {
    return { outline: null, facingPreviews: [] as ReaderFacingPagePreview[] };
  }

  const activeIndex = items.findIndex((item) => item.structureItemId === activeItemId);
  if (activeIndex < 0) {
    return { outline: null, facingPreviews: [] as ReaderFacingPagePreview[] };
  }

  const facingPreviews: ReaderFacingPagePreview[] = [];

  const preceding = items[activeIndex - 1];
  if (preceding && preceding.content) {
    const localIndex = preceding.layout.pageEnds.length - 1;
    const start = localIndex > 0 ? preceding.layout.pageEnds[localIndex - 1] : 0;
    const end = preceding.layout.pageEnds[localIndex];
    facingPreviews.push({
      itemId: preceding.structureItemId,
      localIndex,
      text: preceding.content.slice(start, end),
    });
  }

  const following = items[activeIndex + 1];
  if (following && following.content) {
    facingPreviews.push({
      itemId: following.structureItemId,
      localIndex: 0,
      text: following.content.slice(0, following.layout.pageEnds[0]),
    });
  }

  return {
    outline: items.map((item) => item.structureItemId === activeItemId
      ? item
      : { ...item, content: "" }),
    facingPreviews,
  };
}
