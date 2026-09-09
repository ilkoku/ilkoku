import "server-only";

import type { BookPublicationLayoutSubmission } from "./book-publication";
import { prepareBookForPublication } from "./book-structure-repository";
import { deliverPublicationNotifications } from "./publication-notifications";
import type { PublicationLayoutSnapshot } from "./publication-layout";
import { publishFullBookWithEvent } from "./publish-full-book-event";
import type { ChapterDraftInput } from "./validators";

function hasMeaningfulText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .length > 0;
}

export async function publishFullBook(
  authorId: string,
  input: ChapterDraftInput,
  publicationLayout: PublicationLayoutSnapshot,
  bookLayouts: BookPublicationLayoutSubmission,
) {
  if (!hasMeaningfulText(input.content)) {
    throw new Error(
      "Boş bir bölüm yayımlanamaz. Bölüm metnini yazdıktan sonra tekrar dene.",
    );
  }

  // Yayınla = current Writer state. In particular, İçindekiler must be
  // regenerated from the unsaved chapter title carried by this exact publish.
  await prepareBookForPublication(authorId, input.workId, {
    chapterId: input.chapterId,
    title: input.title,
  });

  const {
    bookPublication,
    publicationEvent,
    work: publishedWork,
  } = await publishFullBookWithEvent(
    authorId,
    input,
    publicationLayout,
    bookLayouts,
  );

  try {
    await deliverPublicationNotifications({
      authorId,
      chapterId: input.chapterId,
      publicationEvent,
      workId: input.workId,
    });
  } catch (notificationError) {
    console.error(
      "PUBLICATION_POST_COMMIT_NOTIFICATION_FAILED",
      {
        error:
          notificationError instanceof Error
            ? notificationError.message
            : "UNKNOWN_ERROR",
        workId: input.workId,
      },
    );
  }

  return {
    bookPublication,
    work: publishedWork,
  };
}
