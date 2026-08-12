import "server-only";

import type {
  UserRole,
} from "@/features/auth/types";
import { prisma } from "@/lib/prisma";

export type SidebarBadgeMap =
  Record<string, string>;

function formatBadge(count: number) {
  return count > 99
    ? "99+"
    : count.toLocaleString("tr-TR");
}

function addBadge(
  badges: SidebarBadgeMap,
  href: string,
  count: number,
) {
  if (count > 0) {
    badges[href] =
      formatBadge(count);
  }
}

export async function getSidebarBadges({
  id: userId,
  role,
}: {
  id: string;
  role: UserRole;
}): Promise<SidebarBadgeMap> {
  const badges: SidebarBadgeMap = {};

  if (role === "writer") {
    const [
      unansweredComments,
      unreadFeedback,
    ] = await Promise.all([
      prisma.comment.count({
        where: {
          deletedAt: null,
          parentId: null,
          status: "visible",
          replies: {
            none: {
              deletedAt: null,
              status: "visible",
              userId,
            },
          },
          work: {
            is: {
              archivedAt: null,
              authorId: userId,
              publishedAt: {
                not: null,
              },
              status: "published",
              visibility: "public",
            },
          },
        },
      }),
      prisma.editorFeedback.count({
        where: {
          archivedAt: null,
          authorId: userId,
          status: "unread",
        },
      }),
    ]);

    addBadge(
      badges,
      "/yorumlarim",
      unansweredComments,
    );

    addBadge(
      badges,
      "/geri-bildirimler",
      unreadFeedback,
    );

    return badges;
  }

  if (
    role === "reader" ||
    role === "editor_pending"
  ) {
    const unreadNotifications =
      await prisma.notification.count({
        where: {
          readAt: null,
          userId,
        },
      });

    addBadge(
      badges,
      "/bildirimler",
      unreadNotifications,
    );

    return badges;
  }

  if (role === "editor") {
    const [
      newRequests,
      activeReviews,
      publisherRequests,
      unreadNotifications,
    ] = await Promise.all([
      prisma.editorReviewAssignment.count({
        where: {
          editorId: null,
          source: "pool",
          status: "waiting",
          work: {
            is: {
              archivedAt: null,
              authorId: {
                not: userId,
              },
              publishedAt: {
                not: null,
              },
              status: "published",
              visibility: "public",
            },
          },
        },
      }),
      prisma.editorReviewAssignment.count({
        where: {
          editorId: userId,
          status: {
            in: [
              "assigned",
              "in_progress",
            ],
          },
        },
      }),
      prisma.publisherEditorRequest.count({
        where: {
          OR: [
            {
              assignedEditorId: null,
              status: "waiting",
            },
            {
              assignedEditorId: userId,
              status: "in_progress",
            },
          ],
        },
      }),
      prisma.notification.count({
        where: {
          readAt: null,
          userId,
        },
      }),
    ]);

    addBadge(
      badges,
      "/editor/talepler",
      newRequests,
    );

    addBadge(
      badges,
      "/editor/yayinevi-talepleri",
      publisherRequests,
    );

    addBadge(
      badges,
      "/editor/incelemeler",
      activeReviews,
    );

    addBadge(
      badges,
      "/editor/bildirimler",
      unreadNotifications,
    );

    return badges;
  }

  if (role === "publisher") {
    const membership =
      await prisma.publisherMembership.findFirst({
        where: {
          active: true,
          userId,
          publisher: {
            is: {
              active: true,
              archivedAt: null,
            },
          },
        },
        select: {
          publisherId: true,
        },
      });

    const unreadNotifications =
      await prisma.notification.count({
        where: {
          readAt: null,
          userId,
        },
      });

    addBadge(
      badges,
      "/yayinevi/bildirimler",
      unreadNotifications,
    );

    if (!membership) {
      return badges;
    }

    const [
      pending,
      reviewing,
      activeEditorRequests,
    ] = await Promise.all([
      prisma.publisherSubmission.count({
        where: {
          archivedAt: null,
          publisherId:
            membership.publisherId,
          status: "pending",
        },
      }),
      prisma.publisherSubmission.count({
        where: {
          archivedAt: null,
          publisherId:
            membership.publisherId,
          status: "reviewing",
        },
      }),
      prisma.publisherEditorRequest.count({
        where: {
          publisherId: membership.publisherId,
          status: {
            in: ["waiting", "in_progress"],
          },
        },
      }),
    ]);

    addBadge(
      badges,
      "/yayinevi?durum=pending",
      pending,
    );

    addBadge(
      badges,
      "/yayinevi?durum=reviewing",
      reviewing,
    );

    addBadge(
      badges,
      "/yayinevi/editor-talepleri",
      activeEditorRequests,
    );
  }

  return badges;
}
