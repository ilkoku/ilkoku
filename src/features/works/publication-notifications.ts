import { sendReaderFavoriteWorkUpdateEmail } from "@/lib/email/reader-emails";
import { prisma } from "@/lib/prisma";
import type { WorkPublicationEvent } from "./publish-work-event";
import { deliverPublisherFollowedAuthorPublication } from "./publisher-follow-publication";

function publicName(user: {
  displayName: string | null;
  fullName: string;
  username: string | null;
}) {
  return user.displayName ?? user.username ?? user.fullName;
}

function logFailure(event: string, workId: string, error: unknown) {
  console.error("PUBLICATION_NOTIFICATION_FAILED", {
    event,
    workId,
    error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
  });
}

async function createReaderFavoriteAuthorPublicationNotifications(input: {
  authorId: string;
  authorName: string;
  workId: string;
  workTitle: string;
}) {
  const favorites = await prisma.readerAuthorFavorite.findMany({
    where: {
      authorId: input.authorId,
      userId: { not: input.authorId },
      user: {
        is: {
          deletedAt: null,
          status: "active",
        },
      },
    },
    select: { userId: true },
  });

  const recipientIds = Array.from(
    new Set(favorites.map((favorite) => favorite.userId)),
  );

  if (recipientIds.length === 0) return;

  await prisma.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM Work
      WHERE id = ${input.workId}
      LIMIT 1
      FOR UPDATE
    `;

    if (!locked[0]) return;

    const existing = await transaction.notification.findMany({
      where: {
        relatedEntityId: input.workId,
        relatedEntityType: "work",
        title: "Favori yazarınız yeni eser yayımladı",
        type: "system",
        userId: { in: recipientIds },
      },
      select: { userId: true },
    });
    const existingRecipientIds = new Set(
      existing.map((notification) => notification.userId),
    );
    const missingRecipientIds = recipientIds.filter(
      (userId) => !existingRecipientIds.has(userId),
    );

    if (missingRecipientIds.length === 0) return;

    await transaction.notification.createMany({
      data: missingRecipientIds.map((userId) => ({
        message: `${input.authorName}, ${input.workTitle} adlı yeni eserini yayımladı.`,
        relatedEntityId: input.workId,
        relatedEntityType: "work",
        title: "Favori yazarınız yeni eser yayımladı",
        type: "system" as const,
        userId,
      })),
    });
  });
}

export async function deliverPublicationNotifications(input: {
  authorId: string;
  chapterId: string;
  publicationEvent: WorkPublicationEvent;
  workId: string;
}) {
  const work = await prisma.work.findFirst({
    where: {
      authorId: input.authorId,
      id: input.workId,
    },
    select: {
      author: {
        select: {
          displayName: true,
          fullName: true,
          id: true,
          username: true,
        },
      },
      chapters: {
        where: { id: input.chapterId },
        select: {
          createdAt: true,
          position: true,
          title: true,
        },
        take: 1,
      },
      contentRating: true,
      favorites: {
        select: {
          user: {
            select: {
              deletedAt: true,
              email: true,
              emailVerified: true,
              fullName: true,
              id: true,
              status: true,
            },
          },
        },
      },
      id: true,
      slug: true,
      title: true,
    },
  });

  if (!work) return;

  // 18+ work titles and chapter details must never be pushed to a recipient
  // before that recipient's age + explicit adult-content consent are checked.
  // Until notification delivery is recipient-gated, adult publications are pull-only.
  if (work.contentRating === "adult_18") return;

  const chapter = work.chapters[0] ?? null;
  const previousPublicationAt = input.publicationEvent.previousPublicationAt;
  const isNewChapter = Boolean(
    !input.publicationEvent.isFirstPublication &&
      previousPublicationAt &&
      chapter &&
      chapter.createdAt > previousPublicationAt,
  );

  if (isNewChapter && chapter) {
    const readers = work.favorites
      .map((favorite) => favorite.user)
      .filter(
        (reader) => reader.status === "active" && reader.deletedAt === null,
      );

    if (readers.length > 0) {
      try {
        await prisma.notification.createMany({
          data: readers.map((reader) => ({
            message: `${work.title} favori eserinizin ${chapter.title} bölümü yayımlandı.`,
            relatedEntityId: work.id,
            relatedEntityType: "work",
            title: "Favorinizdeki esere yeni bölüm eklendi",
            type: "system" as const,
            userId: reader.id,
          })),
        });
      } catch (notificationError) {
        logFailure(
          "reader_favorite_notification",
          work.id,
          notificationError,
        );
      }

      const deliveryResults = await Promise.allSettled(
        readers
          .filter((reader) => reader.emailVerified !== null)
          .map((reader) =>
            sendReaderFavoriteWorkUpdateEmail({
              chapterPosition: chapter.position,
              chapterTitle: chapter.title,
              email: reader.email,
              readerName: reader.fullName,
              workSlug: work.slug,
              workTitle: work.title,
            }),
          ),
      );

      deliveryResults.forEach((delivery, index) => {
        if (delivery.status === "rejected") {
          logFailure(
            `reader_favorite_email_${index}`,
            work.id,
            delivery.reason,
          );
        }
      });
    }
  }

  if (!input.publicationEvent.isFirstPublication) return;

  try {
    await createReaderFavoriteAuthorPublicationNotifications({
      authorId: work.author.id,
      authorName: publicName(work.author),
      workId: work.id,
      workTitle: work.title,
    });
  } catch (readerAuthorError) {
    logFailure(
      "reader_favorite_author_published",
      work.id,
      readerAuthorError,
    );
  }

  try {
    await deliverPublisherFollowedAuthorPublication({
      authorId: work.author.id,
      authorName: publicName(work.author),
      workId: work.id,
      workSlug: work.slug,
      workTitle: work.title,
    });
  } catch (publisherError) {
    logFailure(
      "publisher_followed_author_published",
      work.id,
      publisherError,
    );
  }
}
