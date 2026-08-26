"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  sendReaderCommentReplyEmail,
} from "@/lib/email/reader-emails";
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

const createCommentReplySchema = z.object({
  content: z.string().trim().min(3).max(600),
  parentId: z.string().uuid(),
  returnPath: z.string().min(1).max(5000),
});

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

export async function createCommentReplyAction(
  formData: FormData,
) {
  const writer = await getCurrentUser();

  if (
    !writer ||
    writer.status !== "active" ||
    writer.role !== "writer"
  ) {
    throw new Error(
      "WRITER_PERMISSION_REQUIRED",
    );
  }

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
        user: {
          select: {
            displayName: true,
            email: true,
            emailVerified: true,
            fullName: true,
            id: true,
            username: true,
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

  if (
    parent.userId !== writer.id &&
    parent.user.emailVerified
  ) {
    try {
      await sendReaderCommentReplyEmail({
        chapterPosition:
          parentChapter.position,
        commentId: parentId,
        email: parent.user.email,
        readerName:
          displayName(parent.user),
        workSlug: parent.work.slug,
        workTitle: parent.work.title,
        writerName:
          displayName(writer),
      });
    } catch (emailError) {
      console.error(
        "READER_COMMENT_REPLY_EMAIL_FAILED",
        {
          commentId: parentId,
          error:
            emailError instanceof Error
              ? emailError.message
              : "UNKNOWN_ERROR",
          readerId: parent.user.id,
          workId: parent.work.id,
        },
      );
    }
  }

  const chapterPath =
    `/oku/${parent.work.slug}/bolum-${parentChapter.position}`;

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
