import { prisma } from "@/lib/prisma";
import type { FeedbackStatus } from "../types";

export function getAuthorFeedbackRows(
  authorId: string,
  options?: { excludeArchived?: boolean; limit?: number },
) {
  return prisma.editorFeedback.findMany({
    where: {
      authorId,
      ...(options?.excludeArchived ? { status: { not: "archived" } } : {}),
    },
    include: {
      chapter: { select: { id: true, position: true, title: true } },
      editor: { select: { fullName: true } },
      work: { select: { id: true, slug: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    ...(options?.limit ? { take: options.limit } : {}),
  });
}

export function getUnreadFeedbackCount(authorId: string) {
  return prisma.editorFeedback.count({
    where: { authorId, status: "unread" },
  });
}

export function updateAuthorFeedbackStatus(
  authorId: string,
  feedbackId: string,
  status: Exclude<FeedbackStatus, "unread">,
) {
  const now = new Date();

  return prisma.editorFeedback.updateMany({
    where: { id: feedbackId, authorId },
    data:
      status === "read"
        ? { readAt: now, status }
        : { archivedAt: now, status },
  });
}

export async function insertEditorFeedback(input: {
  category: string;
  chapterId: string | null;
  content: string;
  editorId: string;
  priority: "normal" | "important";
  title: string;
  workId: string;
}) {
  const work = await prisma.work.findUnique({
    where: { id: input.workId },
    select: { authorId: true },
  });

  if (!work) throw new Error("WORK_NOT_FOUND");

  if (input.chapterId) {
    const chapter = await prisma.chapter.findFirst({
      where: { id: input.chapterId, workId: input.workId },
      select: { id: true },
    });
    if (!chapter) throw new Error("CHAPTER_NOT_FOUND");
  }

  return prisma.editorFeedback.create({
    data: {
      authorId: work.authorId,
      category: input.category,
      chapterId: input.chapterId,
      content: input.content,
      editorId: input.editorId,
      priority: input.priority,
      title: input.title,
      workId: input.workId,
    },
  });
}
