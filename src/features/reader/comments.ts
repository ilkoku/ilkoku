"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { allocatePublicId } from "@/lib/public-id";
import { prisma } from "@/lib/prisma";

const publicWorkWhere = {
  archivedAt: null,
  publishedAt: {
    not: null,
  },
  status: "published" as const,
  visibility: "public" as const,
};

const visibleCommentWhere = {
  deletedAt: null,
  status: "visible" as const,
};

const createChapterCommentSchema = z.object({
  chapterId: z.string().uuid(),
  content: z.string().trim().min(3).max(600),
  returnPath: z.string().min(1).max(500),
  workId: z.string().uuid(),
});

const createCommentReplySchema = z.object({
  content: z.string().trim().min(3).max(600),
  parentId: z.string().uuid(),
  returnPath: z.string().min(1).max(500),
});

export type ReaderCommentReplyItem = {
  content: string;
  createdAt: Date;
  id: string;
  isAuthorReply: boolean;
  userName: string;
  username: string | null;
};

export type ReaderCommentItem = {
  chapterTitle: string | null;
  content: string;
  createdAt: Date;
  id: string;
  replies: ReaderCommentReplyItem[];
  userName: string;
  username: string | null;
  workTitle: string | null;
};

export type ReaderCommentFeed = {
  items: ReaderCommentItem[];
  total: number;
};

export type WriterCommentFeed = ReaderCommentFeed & {
  unanswered: number;
};

async function requireReader() {
  const user = await getCurrentUser();

  if (
    !user ||
    user.status !== "active" ||
    !canAccessReaderWorkspace(user.role)
  ) {
    throw new Error("READER_PERMISSION_REQUIRED");
  }

  return user;
}

async function requireWriter() {
  const user = await getCurrentUser();

  if (
    !user ||
    user.status !== "active" ||
    user.role !== "writer"
  ) {
    throw new Error("WRITER_PERMISSION_REQUIRED");
  }

  return user;
}

function safeReturnPath(
  value: string,
  fallback: string,
) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return fallback;
  }

  return value;
}

function displayName(user: {
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

function mapReply(
  reply: {
    content: string;
    createdAt: Date;
    id: string;
    userId: string;
    user: {
      displayName: string | null;
      fullName: string;
      username: string | null;
    };
  },
  authorId: string,
): ReaderCommentReplyItem {
  return {
    content: reply.content,
    createdAt: reply.createdAt,
    id: reply.id,
    isAuthorReply:
      reply.userId === authorId,
    userName: displayName(reply.user),
    username: reply.user.username,
  };
}

export async function createChapterCommentAction(
  formData: FormData,
) {
  const user = await requireReader();

  const parsed =
    createChapterCommentSchema.safeParse({
      chapterId: formData.get("chapterId"),
      content: formData.get("content"),
      returnPath: formData.get("returnPath"),
      workId: formData.get("workId"),
    });

  if (!parsed.success) {
    throw new Error("INVALID_COMMENT_INPUT");
  }

  const {
    chapterId,
    content,
    returnPath,
    workId,
  } = parsed.data;

  const chapter =
    await prisma.chapter.findFirst({
      where: {
        archivedAt: null,
        id: chapterId,
        publishedAt: {
          not: null,
        },
        status: "published",
        workId,
        work: {
          is: publicWorkWhere,
        },
      },
      select: {
        position: true,
        work: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });

  if (!chapter) {
    throw new Error(
      "PUBLIC_CHAPTER_NOT_FOUND",
    );
  }

  await prisma.$transaction(async (transaction) => {
    const commentCreatedAt = new Date();
    const publicId = await allocatePublicId(
      transaction,
      "comment",
      commentCreatedAt,
    );

    await transaction.comment.create({
      data: {
        chapterId,
        content,
        createdAt: commentCreatedAt,
        publicId,
        status: "visible",
        userId: user.id,
        workId: chapter.work.id,
      },
    });
  });

  const chapterPath =
    `/oku/${chapter.work.slug}/bolum-${chapter.position}`;

  revalidatePath(chapterPath);
  revalidatePath(
    `/kitap/${chapter.work.slug}`,
  );
  revalidatePath("/kesfet");
  revalidatePath("/okumaya-devam");
  revalidatePath("/tamamlanan-eserler");
  revalidatePath("/favorilerim");
  revalidatePath("/okuyucu");
  revalidatePath("/yorumlarim");

  redirect(
    `${safeReturnPath(
      returnPath,
      chapterPath,
    )}#yorumlar-basligi`,
  );
}

export async function createCommentReplyAction(
  formData: FormData,
) {
  const writer = await requireWriter();

  const parsed =
    createCommentReplySchema.safeParse({
      content: formData.get("content"),
      parentId: formData.get("parentId"),
      returnPath:
        formData.get("returnPath"),
    });

  if (!parsed.success) {
    throw new Error(
      "INVALID_COMMENT_REPLY_INPUT",
    );
  }

  const {
    content,
    parentId,
    returnPath,
  } = parsed.data;

  const parent =
    await prisma.comment.findFirst({
      where: {
        ...visibleCommentWhere,
        id: parentId,
        parentId: null,
        chapter: {
          is: {
            archivedAt: null,
            publishedAt: {
              not: null,
            },
            status: "published",
          },
        },
        replies: {
          none: {
            ...visibleCommentWhere,
            userId: writer.id,
          },
        },
        work: {
          is: {
            ...publicWorkWhere,
            authorId: writer.id,
          },
        },
      },
      select: {
        chapter: {
          select: {
            id: true,
            position: true,
          },
        },
        userId: true,
        work: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });

  if (!parent?.chapter) {
    throw new Error(
      "WRITER_PARENT_COMMENT_NOT_FOUND",
    );
  }

  const parentChapter = parent.chapter;

  await prisma.$transaction(async (transaction) => {
    const commentCreatedAt = new Date();
    const publicId = await allocatePublicId(
      transaction,
      "comment",
      commentCreatedAt,
    );

    await transaction.comment.create({
      data: {
        chapterId: parentChapter.id,
        content,
        createdAt: commentCreatedAt,
        parentId,
        publicId,
        status: "visible",
        userId: writer.id,
        workId: parent.work.id,
      },
    });

    if (parent.userId !== writer.id) {
      await transaction.notification.create({
        data: {
          message:
            `${displayName(writer)}, ${parent.work.title} eserindeki yorumunuza yanıt verdi.`,
          relatedEntityId: parentId,
          relatedEntityType: "comment",
          title:
            "Yazar yorumunuza yanıt verdi",
          type:
            "reader_comment_reply",
          userId: parent.userId,
        },
      });
    }
  });

  const chapterPath =
    `/oku/${parent.work.slug}/bolum-${parent.chapter.position}`;

  revalidatePath(chapterPath);
  revalidatePath(
    `/kitap/${parent.work.slug}`,
  );
  revalidatePath("/bildirimler");
  revalidatePath("/yorumlarim");
  revalidatePath("/kesfet");
  revalidatePath("/okumaya-devam");
  revalidatePath("/tamamlanan-eserler");
  revalidatePath("/favorilerim");
  revalidatePath("/okuyucu");

  redirect(
    `${safeReturnPath(
      returnPath,
      "/yorumlarim",
    )}#yorum-${parentId}`,
  );
}

export async function getChapterComments(
  chapterId: string,
): Promise<ReaderCommentFeed> {
  const totalWhere = {
    chapterId,
    ...visibleCommentWhere,
  };

  const rootWhere = {
    ...totalWhere,
    parentId: null,
  };

  const [total, comments] =
    await Promise.all([
      prisma.comment.count({
        where: totalWhere,
      }),
      prisma.comment.findMany({
        where: rootWhere,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          content: true,
          createdAt: true,
          id: true,
          replies: {
            where: visibleCommentWhere,
            orderBy: {
              createdAt: "asc",
            },
            select: {
              content: true,
              createdAt: true,
              id: true,
              userId: true,
              user: {
                select: {
                  displayName: true,
                  fullName: true,
                  username: true,
                },
              },
            },
            take: 50,
          },
          user: {
            select: {
              displayName: true,
              fullName: true,
              username: true,
            },
          },
          work: {
            select: {
              authorId: true,
            },
          },
        },
        take: 50,
      }),
    ]);

  return {
    items: comments.map(
      (comment) => ({
        chapterTitle: null,
        content: comment.content,
        createdAt: comment.createdAt,
        id: comment.id,
        replies:
          comment.replies.map(
            (reply) =>
              mapReply(
                reply,
                comment.work.authorId,
              ),
          ),
        userName:
          displayName(comment.user),
        username:
          comment.user.username,
        workTitle: null,
      }),
    ),
    total,
  };
}

export async function getWorkLatestComments(
  workId: string,
): Promise<ReaderCommentFeed> {
  const totalWhere = {
    workId,
    ...visibleCommentWhere,
  };

  const rootWhere = {
    ...totalWhere,
    parentId: null,
  };

  const [total, comments] =
    await Promise.all([
      prisma.comment.count({
        where: totalWhere,
      }),
      prisma.comment.findMany({
        where: rootWhere,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          chapter: {
            select: {
              title: true,
            },
          },
          content: true,
          createdAt: true,
          id: true,
          replies: {
            where: visibleCommentWhere,
            orderBy: {
              createdAt: "asc",
            },
            select: {
              content: true,
              createdAt: true,
              id: true,
              userId: true,
              user: {
                select: {
                  displayName: true,
                  fullName: true,
                  username: true,
                },
              },
            },
            take: 20,
          },
          user: {
            select: {
              displayName: true,
              fullName: true,
              username: true,
            },
          },
          work: {
            select: {
              authorId: true,
            },
          },
        },
        take: 5,
      }),
    ]);

  return {
    items: comments.map(
      (comment) => ({
        chapterTitle:
          comment.chapter?.title ??
          null,
        content: comment.content,
        createdAt: comment.createdAt,
        id: comment.id,
        replies:
          comment.replies.map(
            (reply) =>
              mapReply(
                reply,
                comment.work.authorId,
              ),
          ),
        userName:
          displayName(comment.user),
        username:
          comment.user.username,
        workTitle: null,
      }),
    ),
    total,
  };
}

export async function getWriterComments(
  authorId: string,
): Promise<WriterCommentFeed> {
  const rootWhere = {
    ...visibleCommentWhere,
    parentId: null,
    work: {
      is: {
        ...publicWorkWhere,
        authorId,
      },
    },
  };

  const unansweredWhere = {
    ...rootWhere,
    replies: {
      none: {
        ...visibleCommentWhere,
        userId: authorId,
      },
    },
  };

  const [
    total,
    unanswered,
    comments,
  ] = await Promise.all([
    prisma.comment.count({
      where: rootWhere,
    }),
    prisma.comment.count({
      where: unansweredWhere,
    }),
    prisma.comment.findMany({
      where: rootWhere,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        chapter: {
          select: {
            title: true,
          },
        },
        content: true,
        createdAt: true,
        id: true,
        replies: {
          where: visibleCommentWhere,
          orderBy: {
            createdAt: "asc",
          },
          select: {
            content: true,
            createdAt: true,
            id: true,
            userId: true,
            user: {
              select: {
                displayName: true,
                fullName: true,
                username: true,
              },
            },
          },
          take: 50,
        },
        user: {
          select: {
            displayName: true,
            fullName: true,
            username: true,
          },
        },
        work: {
          select: {
            authorId: true,
            title: true,
          },
        },
      },
      take: 100,
    }),
  ]);

  return {
    items: comments.map(
      (comment) => ({
        chapterTitle:
          comment.chapter?.title ??
          null,
        content: comment.content,
        createdAt: comment.createdAt,
        id: comment.id,
        replies:
          comment.replies.map(
            (reply) =>
              mapReply(
                reply,
                comment.work.authorId,
              ),
          ),
        userName:
          displayName(comment.user),
        username:
          comment.user.username,
        workTitle:
          comment.work.title,
      }),
    ),
    total,
    unanswered,
  };
}
