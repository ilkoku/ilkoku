import {
  sendPublisherFollowedAuthorPublishedEmail,
} from "@/lib/email/publisher-engagement-emails";
import {
  sendReaderFavoriteWorkUpdateEmail,
} from "@/lib/email/reader-emails";
import { prisma } from "@/lib/prisma";

function publicName(user: {
  displayName: string | null;
  fullName: string;
  username: string | null;
}) {
  return (
    user.displayName ??
    user.username ??
    user.fullName
  );
}

function logFailure(
  event: string,
  workId: string,
  error: unknown,
) {
  console.error(
    "PUBLICATION_NOTIFICATION_FAILED",
    {
      event,
      workId,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    },
  );
}

export async function deliverPublicationNotifications(input: {
  authorId: string;
  chapterId: string;
  workId: string;
}) {
  const [work, publicationAudits] =
    await Promise.all([
      prisma.work.findFirst({
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
            where: {
              id: input.chapterId,
            },
            select: {
              createdAt: true,
              position: true,
              title: true,
            },
            take: 1,
          },
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
      }),
      prisma.auditLog.findMany({
        where: {
          action: "work_published",
          entityId: input.workId,
          entityType: "Work",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
        take: 2,
      }),
    ]);

  if (!work) return;

  const chapter = work.chapters[0] ?? null;
  const previousPublicationAt =
    publicationAudits[1]?.createdAt ?? null;
  const isNewWork =
    previousPublicationAt === null;
  const isNewChapter = Boolean(
    previousPublicationAt &&
      chapter &&
      chapter.createdAt >
        previousPublicationAt,
  );

  if (isNewChapter && chapter) {
    const readers = work.favorites
      .map((favorite) => favorite.user)
      .filter(
        (reader) =>
          reader.status === "active" &&
          reader.deletedAt === null,
      );

    if (readers.length > 0) {
      try {
        await prisma.notification.createMany({
          data: readers.map((reader) => ({
            message:
              `${work.title} favori eserinizin ${chapter.title} bölümü yayımlandı.`,
            relatedEntityId: work.id,
            relatedEntityType: "work",
            title:
              "Favorinizdeki esere yeni bölüm eklendi",
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

      const deliveryResults =
        await Promise.allSettled(
          readers
            .filter(
              (reader) =>
                reader.emailVerified !== null,
            )
            .map((reader) =>
              sendReaderFavoriteWorkUpdateEmail({
                chapterPosition:
                  chapter.position,
                chapterTitle:
                  chapter.title,
                email: reader.email,
                readerName:
                  reader.fullName,
                workSlug: work.slug,
                workTitle: work.title,
              }),
            ),
        );

      deliveryResults.forEach(
        (delivery, index) => {
          if (
            delivery.status ===
            "rejected"
          ) {
            logFailure(
              `reader_favorite_email_${index}`,
              work.id,
              delivery.reason,
            );
          }
        },
      );
    }
  }

  if (!isNewWork) return;

  try {
    const follows =
      await prisma.publisherAuthorFollow.findMany({
        where: {
          authorId: work.author.id,
          createdBy: {
            is: {
              deletedAt: null,
              status: "active",
            },
          },
        },
        select: {
          createdBy: {
            select: {
              email: true,
              emailVerified: true,
              fullName: true,
              id: true,
            },
          },
        },
      });

    const recipientMap = new Map<
      string,
      {
        email: string;
        emailVerified: Date | null;
        fullName: string;
        id: string;
      }
    >();

    for (const follow of follows) {
      if (follow.createdBy) {
        recipientMap.set(
          follow.createdBy.id,
          follow.createdBy,
        );
      }
    }

    const recipients =
      Array.from(recipientMap.values());

    if (recipients.length === 0) {
      return;
    }

    await prisma.notification.createMany({
      data: recipients.map((member) => ({
        message:
          `${publicName(work.author)}, ${work.title} adlı yeni eserini yayımladı.`,
        relatedEntityId: work.id,
        relatedEntityType: "work",
        title:
          "Takip ettiğiniz yazar yeni eser yayımladı",
        type:
          "publisher_followed_author_published" as const,
        userId: member.id,
      })),
    });

    const deliveryResults =
      await Promise.allSettled(
        recipients
          .filter(
            (member) =>
              member.emailVerified !== null,
          )
          .map((member) =>
            sendPublisherFollowedAuthorPublishedEmail({
              authorName:
                publicName(work.author),
              email: member.email,
              memberName:
                member.fullName,
              workSlug: work.slug,
              workTitle: work.title,
            }),
          ),
      );

    deliveryResults.forEach(
      (delivery, index) => {
        if (
          delivery.status ===
          "rejected"
        ) {
          logFailure(
            `publisher_follow_email_${index}`,
            work.id,
            delivery.reason,
          );
        }
      },
    );
  } catch (publisherError) {
    logFailure(
      "publisher_followed_author_published",
      work.id,
      publisherError,
    );
  }
}
