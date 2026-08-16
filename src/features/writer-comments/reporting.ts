import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const EXPORT_PAGE_SIZE = 250;

const visibleCommentWhere = {
  deletedAt: null,
  status: "visible" as const,
};

const publicWorkWhere = {
  archivedAt: null,
  publishedAt: { not: null },
  status: "published" as const,
  visibility: "public" as const,
};

function writerRootCommentWhere(
  authorId: string,
): Prisma.CommentWhereInput {
  return {
    ...visibleCommentWhere,
    parentId: null,
    work: {
      is: {
        ...publicWorkWhere,
        authorId,
      },
    },
  };
}

function writerUnansweredCommentWhere(
  authorId: string,
): Prisma.CommentWhereInput {
  return {
    ...writerRootCommentWhere(authorId),
    replies: {
      none: {
        ...visibleCommentWhere,
        userId: authorId,
      },
    },
  };
}

function personName(user: {
  displayName: string | null;
  fullName: string;
  username: string | null;
}) {
  return (
    user.displayName?.trim() ||
    user.username?.trim() ||
    user.fullName.trim()
  );
}

function responseRate(total: number, unanswered: number) {
  if (total <= 0) return 0;

  return Math.round(
    ((total - unanswered) / total) * 1000,
  ) / 10;
}

async function isActiveWriter(authorId: string) {
  const writer = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      id: authorId,
      role: "writer",
      status: "active",
    },
    select: { id: true },
  });

  return Boolean(writer);
}

export type WriterCommentAnalysis = {
  answered: number;
  latestCommentAt: Date | null;
  last30Days: number;
  responseRate: number;
  total: number;
  unanswered: number;
  works: Array<{
    id: string;
    responseRate: number;
    title: string;
    total: number;
    unanswered: number;
  }>;
};

export async function getWriterCommentAnalysis(
  authorId: string,
): Promise<WriterCommentAnalysis | null> {
  if (!(await isActiveWriter(authorId))) {
    return null;
  }

  const rootWhere = writerRootCommentWhere(authorId);
  const unansweredWhere = writerUnansweredCommentWhere(authorId);
  const last30DaysStart = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  );

  const [
    total,
    unanswered,
    last30Days,
    latest,
    totalsByWork,
    unansweredByWork,
  ] = await Promise.all([
    prisma.comment.count({ where: rootWhere }),
    prisma.comment.count({ where: unansweredWhere }),
    prisma.comment.count({
      where: {
        ...rootWhere,
        createdAt: { gte: last30DaysStart },
      },
    }),
    prisma.comment.aggregate({
      where: rootWhere,
      _max: { createdAt: true },
    }),
    prisma.comment.groupBy({
      by: ["workId"],
      where: rootWhere,
      _count: { _all: true },
    }),
    prisma.comment.groupBy({
      by: ["workId"],
      where: unansweredWhere,
      _count: { _all: true },
    }),
  ]);

  const workIds = totalsByWork.map((row) => row.workId);
  const works = workIds.length
    ? await prisma.work.findMany({
        where: {
          ...publicWorkWhere,
          authorId,
          id: { in: workIds },
        },
        select: {
          id: true,
          title: true,
        },
      })
    : [];

  const titleById = new Map(
    works.map((work) => [work.id, work.title]),
  );
  const unansweredById = new Map(
    unansweredByWork.map((row) => [
      row.workId,
      row._count._all,
    ]),
  );

  const workBreakdown = totalsByWork
    .flatMap((row) => {
      const title = titleById.get(row.workId);
      if (!title) return [];

      const workUnanswered =
        unansweredById.get(row.workId) ?? 0;

      return [{
        id: row.workId,
        responseRate: responseRate(
          row._count._all,
          workUnanswered,
        ),
        title,
        total: row._count._all,
        unanswered: workUnanswered,
      }];
    })
    .sort((a, b) =>
      b.total - a.total ||
      a.title.localeCompare(b.title, "tr-TR"),
    );

  return {
    answered: Math.max(0, total - unanswered),
    latestCommentAt: latest._max.createdAt,
    last30Days,
    responseRate: responseRate(total, unanswered),
    total,
    unanswered,
    works: workBreakdown,
  };
}

export type WriterCommentExportRow = {
  authorReply: string | null;
  authorReplyAt: Date | null;
  chapterTitle: string | null;
  comment: string;
  commentAt: Date;
  commentPublicId: string;
  readerName: string;
  readerUsername: string | null;
  workTitle: string;
};

export async function getWriterCommentExportPage(input: {
  authorId: string;
  cursor?: string | null;
}) {
  const comments = await prisma.comment.findMany({
    where: writerRootCommentWhere(input.authorId),
    orderBy: { id: "asc" },
    ...(input.cursor
      ? {
          cursor: { id: input.cursor },
          skip: 1,
        }
      : {}),
    take: EXPORT_PAGE_SIZE,
    select: {
      chapter: {
        select: { title: true },
      },
      content: true,
      createdAt: true,
      id: true,
      publicId: true,
      replies: {
        where: {
          ...visibleCommentWhere,
          userId: input.authorId,
        },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
        },
      },
      user: {
        select: {
          displayName: true,
          fullName: true,
          username: true,
        },
      },
      work: {
        select: { title: true },
      },
    },
  });

  return {
    nextCursor:
      comments.length === EXPORT_PAGE_SIZE
        ? comments.at(-1)?.id ?? null
        : null,
    rows: comments.map((comment) => ({
      authorReply:
        comment.replies[0]?.content ?? null,
      authorReplyAt:
        comment.replies[0]?.createdAt ?? null,
      chapterTitle:
        comment.chapter?.title ?? null,
      comment: comment.content,
      commentAt: comment.createdAt,
      commentPublicId: comment.publicId,
      readerName: personName(comment.user),
      readerUsername: comment.user.username,
      workTitle: comment.work.title,
    })) satisfies WriterCommentExportRow[],
  };
}
