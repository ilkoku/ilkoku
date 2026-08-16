import "server-only";

import type { NotificationType } from "@/generated/prisma/client";
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
  return Array.from(
    new Set(
      notifications.flatMap((notification) =>
        notification.relatedEntityType === entityType &&
        notification.relatedEntityId
          ? [notification.relatedEntityId]
          : [],
      ),
    ),
  );
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

  const [works, comments] = await Promise.all([
    workIds.length
      ? prisma.work.findMany({
          where: {
            ...publicWorkWhere,
            id: { in: workIds },
          },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
    commentIds.length
      ? prisma.comment.findMany({
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
        })
      : Promise.resolve([]),
  ]);

  const workSlugById = new Map(
    works.map((work) => [work.id, work.slug]),
  );
  const commentHrefById = new Map(
    comments.flatMap((comment) =>
      comment.chapter
        ? [[
            comment.id,
            `/oku/${encodeURIComponent(comment.work.slug)}/bolum-${comment.chapter.position}#yorum-${comment.id}`,
          ] as const]
        : [],
    ),
  );

  const writerSubmissionIds =
    input.scope === "default" && submissionIds.length
      ? new Set(
          (
            await prisma.publisherSubmission.findMany({
              where: {
                archivedAt: null,
                authorId: input.userId,
                id: { in: submissionIds },
              },
              select: { id: true },
            })
          ).map((submission) => submission.id),
        )
      : new Set<string>();

  let publisherSubmissionIdSet = new Set<string>();
  let publisherEditorRequestIdSet = new Set<string>();

  if (
    input.scope === "publisher" &&
    (submissionIds.length || publisherEditorRequestIds.length)
  ) {
    const membership = await prisma.publisherMembership.findFirst({
      where: {
        active: true,
        userId: input.userId,
        publisher: {
          active: true,
          archivedAt: null,
        },
      },
      select: { publisherId: true },
    });

    if (membership) {
      const [submissions, editorRequests] = await Promise.all([
        submissionIds.length
          ? prisma.publisherSubmission.findMany({
              where: {
                archivedAt: null,
                id: { in: submissionIds },
                publisherId: membership.publisherId,
              },
              select: { id: true },
            })
          : Promise.resolve([]),
        publisherEditorRequestIds.length
          ? prisma.publisherEditorRequest.findMany({
              where: {
                id: { in: publisherEditorRequestIds },
                publisherId: membership.publisherId,
              },
              select: { id: true },
            })
          : Promise.resolve([]),
      ]);

      publisherSubmissionIdSet = new Set(
        submissions.map((submission) => submission.id),
      );
      publisherEditorRequestIdSet = new Set(
        editorRequests.map((request) => request.id),
      );
    }
  }

  let editorSecondAssignmentByWork = new Map<
    string,
    "active" | "completed"
  >();
  let editorRecommendationWorkIds = new Set<string>();

  if (input.scope === "editor" && workIds.length) {
    const [assignments, recommendations] = await Promise.all([
      prisma.editorReviewAssignment.findMany({
        where: {
          editorId: input.userId,
          stage: "second",
          workId: { in: workIds },
        },
        select: {
          status: true,
          workId: true,
        },
      }),
      prisma.editorRecommendation.findMany({
        where: {
          recipientEditorId: input.userId,
          workId: { in: workIds },
        },
        select: { workId: true },
      }),
    ]);

    editorSecondAssignmentByWork = new Map(
      assignments.flatMap((assignment) => {
        if (assignment.status === "completed") {
          return [[assignment.workId, "completed"] as const];
        }
        if (
          assignment.status === "assigned" ||
          assignment.status === "in_progress"
        ) {
          return [[assignment.workId, "active"] as const];
        }
        return [];
      }),
    );
    editorRecommendationWorkIds = new Set(
      recommendations.map((recommendation) => recommendation.workId),
    );
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
      notification.type === "publisher_discovery_share"
    ) {
      href = "/yayinevi/paylasilanlar";
    }

    if (href) {
      targets.set(notification.id, href);
    }
  }

  return targets;
}
