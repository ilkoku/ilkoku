import {
  sendPublisherFollowedAuthorPublishedEmail,
} from "@/lib/email/publisher-engagement-emails";
import {
  sendReaderFavoriteWorkUpdateEmail,
} from "@/lib/email/reader-emails";
import { prisma } from "@/lib/prisma";
import { worksRepository } from "./repository";
import type {
  ChapterDraftInput,
  CreateWorkInput,
  UpdateWorkInput,
} from "./validators";

function hasMeaningfulText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .length > 0;
}

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

function logPublicationNotificationFailure(
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

export function createSlug(value: string) {
  const transliterated = value
    .trim()
    .toLocaleLowerCase("tr")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ü", "u");

  return (
    transliterated
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "yeni-eser"
  );
}

async function createUniqueSlug(
  authorId: string,
  title: string,
) {
  const base = `${createSlug(title)}-${crypto.randomUUID().slice(0, 8)}`;

  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const candidate =
      suffix === 1 ? base : `${base}-${suffix}`;

    const existingWork =
      await worksRepository.findAuthorWorkBySlug(
        authorId,
        candidate,
      );

    if (!existingWork) {
      return candidate;
    }
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createWorkWithFirstChapter(
  authorId: string,
  input: CreateWorkInput,
) {
  const slug = await createUniqueSlug(
    authorId,
    input.title,
  );

  const work = await worksRepository.createWork({
    authorId,
    description: input.summary || null,
    genre: input.genre || null,
    language: "tr",
    slug,
    title: input.title,
  });

  try {
    const chapter =
      await worksRepository.createChapter({
        authorId,
        content: "",
        position: 1,
        status: "draft",
        title: "Bölüm 1",
        workId: work.id,
      });

    return {
      chapter,
      work,
    };
  } catch (caughtError) {
    await worksRepository.deleteWorkAfterFailedCreation(
      authorId,
      work.id,
    );

    throw caughtError;
  }
}

export async function updateWork(
  authorId: string,
  input: UpdateWorkInput,
) {
  const { id, ...changes } = input;

  const status =
    changes.status === "published"
      ? "published"
      : changes.status === "in_progress"
        ? "in_review"
        : changes.status === "draft"
          ? "draft"
          : undefined;

  return worksRepository.updateWork(
    authorId,
    id,
    {
      coverUrl:
        changes.coverUrl === ""
          ? null
          : changes.coverUrl,
      description: changes.summary,
      genre: changes.genre,
      language: changes.language,
      status,
      title: changes.title,
      ...(status === "published"
        ? {
            archivedAt: null,
            publishedAt: new Date(),
            visibility: "public",
          }
        : status
          ? {
              archivedAt: null,
              publishedAt: null,
              visibility: "private",
            }
          : {}),
    },
  );
}

export async function saveChapterDraft(
  authorId: string,
  input: ChapterDraftInput,
) {
  const ownedChapter =
    await worksRepository.getAuthorChapterById(
      authorId,
      input.workId,
      input.chapterId,
    );

  if (!ownedChapter) {
    throw new Error(
      "Bölüm bu esere ait değil veya bölümü düzenleme yetkin yok.",
    );
  }

  const chapter =
    await worksRepository.updateChapter(
      authorId,
      input.chapterId,
      {
        archivedAt: null,
        content: input.content,
        publishedAt: null,
        status: "draft",
        title: input.title,
      },
    );

  await worksRepository.updateWork(
    authorId,
    input.workId,
    {
      archivedAt: null,
      status: "draft",
      visibility: "private",
    },
  );

  return chapter;
}

async function deliverPublicationNotifications(input: {
  author: {
    displayName: string | null;
    fullName: string;
    id: string;
    username: string | null;
  };
  chapter: {
    position: number;
    publishedAt: Date | null;
    status: string;
    title: string;
  } | null;
  favorites: {
    user: {
      deletedAt: Date | null;
      email: string;
      emailVerified: Date | null;
      fullName: string;
      id: string;
      status: string;
    };
  }[];
  publishedAt: Date | null;
  slug: string;
  title: string;
  workId: string;
}) {
  const isNewChapter = Boolean(
    input.publishedAt &&
      input.chapter &&
      (
        input.chapter.publishedAt === null ||
        input.chapter.status !== "published"
      ),
  );
  const isNewWork =
    input.publishedAt === null;

  if (
    isNewChapter &&
    input.chapter
  ) {
    const readers = input.favorites
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
              `${input.title} favori eserinizin ${input.chapter!.title} bölümü yayımlandı.`,
            relatedEntityId: input.workId,
            relatedEntityType: "work",
            title:
              "Favorinizdeki esere yeni bölüm eklendi",
            type: "system" as const,
            userId: reader.id,
          })),
        });
      } catch (notificationError) {
        logPublicationNotificationFailure(
          "reader_favorite_notification",
          input.workId,
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
                  input.chapter!.position,
                chapterTitle:
                  input.chapter!.title,
                email: reader.email,
                readerName:
                  reader.fullName,
                workSlug: input.slug,
                workTitle: input.title,
              }),
            ),
        );

      deliveryResults.forEach(
        (delivery, index) => {
          if (
            delivery.status ===
            "rejected"
          ) {
            logPublicationNotificationFailure(
              `reader_favorite_email_${index}`,
              input.workId,
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
            authorId: input.author.id,
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
        Array.from(
          recipientMap.values(),
        );

      if (recipients.length > 0) {
        await prisma.notification.createMany({
          data: recipients.map((member) => ({
            message:
              `${publicName(input.author)}, ${input.title} adlı yeni eserini yayımladı.`,
            relatedEntityId: input.workId,
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
                    publicName(input.author),
                  email: member.email,
                  memberName:
                    member.fullName,
                  workSlug: input.slug,
                  workTitle: input.title,
                }),
              ),
          );

        deliveryResults.forEach(
          (delivery, index) => {
            if (
              delivery.status ===
              "rejected"
            ) {
              logPublicationNotificationFailure(
                `publisher_follow_email_${index}`,
                input.workId,
                delivery.reason,
              );
            }
          },
        );
      }
    } catch (publisherError) {
      logPublicationNotificationFailure(
        "publisher_followed_author_published",
        input.workId,
        publisherError,
      );
    }
  }
}

export async function publishWork(
  authorId: string,
  input: ChapterDraftInput,
) {
  if (!hasMeaningfulText(input.content)) {
    throw new Error(
      "Boş bir bölüm yayımlanamaz. Bölüm metnini yazdıktan sonra tekrar dene.",
    );
  }

  const before = await prisma.work.findFirst({
    where: {
      authorId,
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
  });

  await saveChapterDraft(authorId, input);

  await worksRepository.publishChapter(
    authorId,
    input.chapterId,
  );

  const publishedWork =
    await worksRepository.publishWork(
      authorId,
      input.workId,
    );

  if (before) {
    try {
      await deliverPublicationNotifications({
        author: before.author,
        chapter:
          before.chapters[0] ?? null,
        favorites: before.favorites,
        publishedAt: before.publishedAt,
        slug: before.slug,
        title: before.title,
        workId: before.id,
      });
    } catch (notificationError) {
      logPublicationNotificationFailure(
        "publication_post_commit",
        before.id,
        notificationError,
      );
    }
  }

  return publishedWork;
}

export async function archiveWork(
  authorId: string,
  workId: string,
) {
  return worksRepository.archiveWork(
    authorId,
    workId,
  );
}

export async function restoreWork(
  authorId: string,
  workId: string,
) {
  return worksRepository.restoreWork(
    authorId,
    workId,
  );
}

export async function createNextChapter(
  authorId: string,
  workId: string,
) {
  const work =
    await worksRepository.getAuthorWorkById(
      authorId,
      workId,
    );

  if (!work) {
    throw new Error(
      "Eser bulunamadı veya bu esere bölüm ekleme yetkin yok.",
    );
  }

  const latestChapter =
    await worksRepository.getLatestChapterPosition(
      authorId,
      workId,
    );

  const position =
    (latestChapter?.position ?? 0) + 1;

  return worksRepository.createChapter({
    authorId,
    content: "",
    position,
    status: "draft",
    title: `Bölüm ${position}`,
    workId,
  });
}
