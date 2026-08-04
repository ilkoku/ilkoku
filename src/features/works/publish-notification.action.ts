"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  sendPublisherFollowedAuthorPublishedEmail,
} from "@/lib/email/publisher-engagement-emails";
import {
  sendReaderFavoriteWorkUpdateEmail,
} from "@/lib/email/reader-emails";
import { prisma } from "@/lib/prisma";
import {
  publishWorkAction as publishWorkCoreAction,
} from "./actions";
import type {
  WorkActionState,
} from "./types";

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

function logDeliveryFailure(
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

export async function publishWorkAction(
  state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const user = await getCurrentUser();
  const workId = String(
    formData.get("workId") ?? "",
  ).trim();
  const chapterId = String(
    formData.get("chapterId") ?? "",
  ).trim();

  const before =
    user?.role === "writer" &&
    workId &&
    chapterId
      ? await prisma.work.findFirst({
          where: {
            authorId: user.id,
            id: workId,
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
                id: chapterId,
              },
              select: {
                id: true,
                position: true,
                publishedAt: true,
                status: true,
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
            publishedAt: true,
            slug: true,
            title: true,
          },
        })
      : null;

  const result =
    await publishWorkCoreAction(
      state,
      formData,
    );

  if (
    result.status !== "success" ||
    !before
  ) {
    return result;
  }

  const chapter = before.chapters[0];
  const isNewChapter = Boolean(
    before.publishedAt &&
      chapter &&
      (
        chapter.publishedAt === null ||
        chapter.status !== "published"
      ),
  );
  const isNewWork =
    before.publishedAt === null;

  if (isNewChapter && chapter) {
    const readers = before.favorites
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
              `${before.title} favori eserinizin ${chapter.title} bölümü yayımlandı.`,
            relatedEntityId: before.id,
            relatedEntityType: "work",
            title:
              "Favorinizdeki esere yeni bölüm eklendi",
            type: "system" as const,
            userId: reader.id,
          })),
        });
      } catch (notificationError) {
        logDeliveryFailure(
          "reader_favorite_notification",
          before.id,
          notificationError,
        );
      }

      const deliveries = readers
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
            workSlug: before.slug,
            workTitle: before.title,
          }),
        );

      const deliveryResults =
        await Promise.allSettled(
          deliveries,
        );

      deliveryResults.forEach(
        (delivery, index) => {
          if (
            delivery.status ===
            "rejected"
          ) {
            logDeliveryFailure(
              `reader_favorite_email_${index}`,
              before.id,
              delivery.reason,
            );
          }
        },
      );
    }
  }

  if (isNewWork) {
    try {
      const follows =
        await prisma.publisherAuthorFollow.findMany({
          where: {
            authorId: before.author.id,
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

      const recipients = Array.from(
        new Map(
          follows
            .map((follow) =>
              follow.createdBy,
            )
            .filter(Boolean)
            .map((member) => [
              member!.id,
              member!,
            ]),
        ).values(),
      );

      if (recipients.length > 0) {
        await prisma.notification.createMany({
          data: recipients.map((member) => ({
            message:
              `${publicName(before.author)}, ${before.title} adlı yeni eserini yayımladı.`,
            relatedEntityId: before.id,
            relatedEntityType: "work",
            title:
              "Takip ettiğiniz yazar yeni eser yayımladı",
            type:
              "publisher_followed_author_published" as const,
            userId: member.id,
          })),
        });

        const deliveries = recipients
          .filter(
            (member) =>
              member.emailVerified !== null,
          )
          .map((member) =>
            sendPublisherFollowedAuthorPublishedEmail({
              authorName:
                publicName(before.author),
              email: member.email,
              memberName:
                member.fullName,
              workSlug: before.slug,
              workTitle: before.title,
            }),
          );

        const deliveryResults =
          await Promise.allSettled(
            deliveries,
          );

        deliveryResults.forEach(
          (delivery, index) => {
            if (
              delivery.status ===
              "rejected"
            ) {
              logDeliveryFailure(
                `publisher_follow_email_${index}`,
                before.id,
                delivery.reason,
              );
            }
          },
        );
      }
    } catch (publisherError) {
      logDeliveryFailure(
        "publisher_followed_author_published",
        before.id,
        publisherError,
      );
    }
  }

  revalidatePath("/bildirimler");
  revalidatePath("/favorilerim");
  revalidatePath("/yayinevi/bildirimler");
  revalidatePath(
    "/yayinevi/takip-ettiklerim",
  );

  return result;
}
