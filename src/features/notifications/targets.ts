import "server-only";

import type {
  EditorAssignmentStatus,
  NotificationType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationTargetScope =
  | "default"
  | "editor"
  | "publisher";

export type NotificationTargetInput = {
  id: string;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  type: NotificationType;
};

type PublicWorkRow = {
  id: string;
  slug: string;
};

type VisibleCommentRow = {
  chapter: {
    position: number;
  } | null;
  id: string;
  work: {
    slug: string;
  };
};

type IdRow = {
  id: string;
};

type EditorAssignmentRow = {
  status: EditorAssignmentStatus;
  workId: string;
};

type EditorRecommendationRow = {
  workId: string;
};

const publicWorkWhere = {
  archivedAt: null,
  publishedAt: { not: null },
  status: "published" as const,
  visibility: "public" as const,
};

function uniqueEntityIds(
  notifications: NotificationTargetInput[],
  entityType: string,
) {
  const ids = new Set<string>();

  for (const notification of notifications) {
    if (
      notification.relatedEntityType === entityType &&
      notification.relatedEntityId
    ) {
      ids.add(notification.relatedEntityId);
    }
  }

  return Array.from(ids);
}

export async function resolveNotificationTargets(input: {
  notifications: NotificationTargetInput[];
  scope: NotificationTargetScope;
  userId: string;
}) {
  const workIds = uniqueEntityIds(input.notifications, "work");
  const commentIds = uniqueEntityIds(input.notifications, "comment");
  const submissionIds = uniqueEntityIds(
    input.notifications,
    "publisher_submission",
  );
  const publisherEditorRequestIds = uniqueEntityIds(
    input.notifications,
    "publisher_editor_request",
  );

  let works: PublicWorkRow[] = [];
  let comments: VisibleCommentRow[] = [];

  if (workIds.length) {
    works = await prisma.work.findMany({
      where: {
        ...publicWorkWhere,
        id: { in: workIds },
      },
      select: { id: true, slug: true },
    });
  }

  if (commentIds.length) {
    comments = await prisma.comment.findMany({
      where: {
        deletedAt: null,
        id: { in: commentIds },
        parentId: null,
        status: "visible",
        chapter: {
          is: {
            archivedAt: null,
            publishedAt: { not: null },
            status: "published",
          },
        },
        work: {
          is: publicWorkWhere,
        },
      },
      select: {
        id: true,
        chapter: {
          select: { position: true },
        },
        work: {
          select: { slug: true },
        },
      },
    });
  }

  const workSlugById = new Map<string, string>();
  for (const work of works) {
    workSlugById.set(work.id, work.slug);
  }

  const commentHrefById = new Map<string, string>();
  for (const comment of comments) {
    if (!comment.chapter) continue;

    commentHrefById.set(
      comment.id,
      `/oku/${encodeURIComponent(comment.work.slug)}/bolum-${comment.chapter.position}#yorum-${comment.id}`,
    );
  }

  const writerSubmissionIds = new Set<string>();

  if (input.scope === "default" && submissionIds.length) {
    const submissions: IdRow[] =
      await prisma.publisherSubmission.findMany({
        where: {
          archivedAt: null,
          authorId: input.userId,
          id: { in: submissionIds },
        },
        select: { id: true },
      });

    for (const submission of submissions) {
      writerSubmissionIds.add(submission.id);
    }
  }

  const publisherSubmissionIdSet = new Set<string>();
  const publisherEditorRequestIdSet = new Set<string>();

  if (
    input.scope === "publisher" &&
    (submissionIds.length || publisherEditorRequestIds.length)
  ) {
    const membership = await prisma.publisherMembership.findFirst({
      where: {
        active: true,
        userId: input.userId,
        publisher: {
          is: {
            active: true,
            archivedAt: null,
          },
        },
      },
      select: { publisherId: true },
    });

    if (membership) {
      if (submissionIds.length) {
        const submissions: IdRow[] =
          await prisma.publisherSubmission.findMany({
            where: {
              archivedAt: null,
              id: { in: submissionIds },
              publisherId: membership.publisherId,
            },
            select: { id: true },
          });

        for (const submission of submissions) {
          publisherSubmissionIdSet.add(submission.id);
        }
      }

      if (publisherEditorRequestIds.length) {
        const editorRequests: IdRow[] =
          await prisma.publisherEditorRequest.findMany({
            where: {
              id: { in: publisherEditorRequestIds },
              publisherId: membership.publisherId,
            },
            select: { id: true },
          });

        for (const request of editorRequests) {
          publisherEditorRequestIdSet.add(request.id);
        }
      }
    }
  }

  const editorSecondAssignmentByWork = new Map<
    string,
    "active" | "completed"
  >();
  const editorRecommendationWorkIds = new Set<string>();

  if (input.scope === "editor" && workIds.length) {
    const assignments: EditorAssignmentRow[] =
      await prisma.editorReviewAssignment.findMany({
        where: {
          editorId: input.userId,
          stage: "second",
          workId: { in: workIds },
        },
        select: {
          status: true,
          workId: true,
        },
      });

    const recommendations: EditorRecommendationRow[] =
      await prisma.editorRecommendation.findMany({
        where: {
          recipientEditorId: input.userId,
          workId: { in: workIds },
        },
        select: { workId: true },
      });

    for (const assignment of assignments) {
      if (assignment.status === "completed") {
        editorSecondAssignmentByWork.set(
          assignment.workId,
          "completed",
        );
      } else if (
        assignment.status === "assigned" ||
        assignment.status === "in_progress"
      ) {
        editorSecondAssignmentByWork.set(
          assignment.workId,
          "active",
        );
      }
    }

    for (const recommendation of recommendations) {
      editorRecommendationWorkIds.add(recommendation.workId);
    }
  }

  const targets = new Map<string, string>();

  for (const notification of input.notifications) {
    const entityId = notification.relatedEntityId;
    const entityType = notification.relatedEntityType;
    let href: string | null = null;

    if (entityType === "comment" && entityId) {
      href = commentHrefById.get(entityId) ?? null;
    } else if (entityType === "work" && entityId) {
      if (input.scope === "editor") {
        const assignmentState =
          editorSecondAssignmentByWork.get(entityId);

        if (assignmentState === "active") {
          href = "/editor/incelemeler?asama=ikinci";
        } else if (assignmentState === "completed") {
          href = "/editor/incelemeler?durum=tamamlanan";
        } else if (editorRecommendationWorkIds.has(entityId)) {
          href = "/editor/onerilenler";
        }
      }

      if (!href) {
        const slug = workSlugById.get(entityId);
        href = slug
          ? `/kitap/${encodeURIComponent(slug)}`
          : null;
      }
    } else if (
      entityType === "publisher_submission" &&
      entityId
    ) {
      if (
        input.scope === "publisher" &&
        publisherSubmissionIdSet.has(entityId)
      ) {
        href = `/yayinevi/basvurular/${encodeURIComponent(entityId)}`;
      } else if (
        input.scope === "default" &&
        writerSubmissionIds.has(entityId)
      ) {
        href = `/yayinevleri?basvuru=${encodeURIComponent(entityId)}`;
      }
    } else if (
      entityType === "publisher_editor_request" &&
      entityId &&
      input.scope === "publisher" &&
      publisherEditorRequestIdSet.has(entityId)
    ) {
      href = "/yayinevi/editor-talepleri";
    } else if (
      entityType === "publisher_permission_request" &&
      input.scope === "publisher"
    ) {
      href = "/yayinevi/yetkilerim";
    }

    if (
      !href &&
      input.scope === "publisher" &&
      notification.type === "publisher_discovery_shared"
    ) {
      href = "/yayinevi/paylasilanlar";
    }

    if (href) {
      targets.set(notification.id, href);
    }
  }

  return targets;
}
