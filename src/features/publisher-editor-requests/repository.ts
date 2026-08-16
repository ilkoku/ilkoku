import "server-only";

import { completedPublishedWorkWhere } from "@/features/editor-workspace/eligibility";
import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import { hasPublisherPermission } from "@/features/publisher-workspace/permissions";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const activeRequestStatuses = ["waiting", "in_progress"] as const;

const eligiblePublisherEditorWorkWhere = {
  ...completedPublishedWorkWhere,
  author: {
    is: {
      deletedAt: null,
      role: "writer",
      status: "active",
    },
  },
} satisfies Prisma.WorkWhereInput;

const requestRecordSelect = {
  assignedEditorId: true,
  compensationEligible: true,
  completedAt: true,
  createdAt: true,
  id: true,
  publisherId: true,
  requestNote: true,
  requestedById: true,
  status: true,
  workId: true,
} as const;

type LockedPublisherEditorRequest = {
  assignedEditorId: string | null;
  compensationEligible: boolean;
  id: string;
  publisherId: string;
  requestedById: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  workId: string;
};

function personName(user: {
  displayName: string | null;
  fullName: string;
}) {
  return user.displayName?.trim() || user.fullName.trim();
}

async function lockPublisherEditorRequest(
  transaction: Prisma.TransactionClient,
  requestId: string,
) {
  const rows = await transaction.$queryRaw<LockedPublisherEditorRequest[]>`
    SELECT
      id,
      publisherId,
      workId,
      requestedById,
      assignedEditorId,
      compensationEligible,
      status
    FROM PublisherEditorRequest
    WHERE id = ${requestId}
    LIMIT 1
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

async function lockActiveEditor(
  transaction: Prisma.TransactionClient,
  editorId: string,
) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM User
    WHERE id = ${editorId}
      AND deletedAt IS NULL
      AND role = 'editor'
      AND status = 'active'
    LIMIT 1
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

async function lockAndValidateEligibleWork(
  transaction: Prisma.TransactionClient,
  workId: string,
) {
  const workRows = await transaction.$queryRaw<
    Array<{ authorId: string; id: string }>
  >`
    SELECT id, authorId
    FROM Work
    WHERE id = ${workId}
    LIMIT 1
    FOR UPDATE
  `;

  const lockedWork = workRows[0];
  if (!lockedWork) return false;

  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM Chapter
    WHERE workId = ${workId}
    ORDER BY id
    FOR UPDATE
  `;

  const authorRows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM User
    WHERE id = ${lockedWork.authorId}
      AND deletedAt IS NULL
      AND role = 'writer'
      AND status = 'active'
    LIMIT 1
    FOR UPDATE
  `;

  if (!authorRows[0]) return false;

  const eligible = await transaction.work.findFirst({
    where: {
      ...eligiblePublisherEditorWorkWhere,
      id: workId,
    },
    select: { id: true },
  });

  return Boolean(eligible);
}

async function cancelLockedIneligibleRequest(
  transaction: Prisma.TransactionClient,
  request: LockedPublisherEditorRequest,
  actorId: string,
) {
  const updated = await transaction.publisherEditorRequest.updateMany({
    where: {
      id: request.id,
      status: { in: [...activeRequestStatuses] },
    },
    data: {
      activeKey: null,
      status: "cancelled",
    },
  });

  if (updated.count !== 1) {
    throw new Error("PUBLISHER_EDITOR_REQUEST_STATE_CHANGED");
  }

  await transaction.notification.create({
    data: {
      message:
        "Editör talebine bağlı eser artık yayınevi editör incelemesi için uygun olmadığı için talep kapatıldı.",
      relatedEntityId: request.id,
      relatedEntityType: "publisher_editor_request",
      title: "Editör talebi kapatıldı",
      type: "system",
      userId: request.requestedById,
    },
  });

  await transaction.auditLog.create({
    data: {
      action: "work_status_changed",
      actorId,
      entityId: request.workId,
      entityType: "Work",
      metadata: JSON.stringify({
        publisherEditorRequestId: request.id,
        publisherId: request.publisherId,
        source: "publisher_editor_request_auto_cancelled_ineligible",
      }),
    },
  });
}

export type PublisherEditorRequestListItem = {
  assignedEditorName: string | null;
  compensationEligible: boolean;
  completedAt: string | null;
  createdAt: string;
  id: string;
  publisherName: string;
  requestNote: string;
  requestedByName: string;
  review: {
    category: string;
    content: string;
    status: "draft" | "completed";
    title: string;
  } | null;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  work: {
    authorName: string;
    id: string;
    slug: string;
    title: string;
  };
};

async function hydrateRequests(
  records: Array<{
    assignedEditorId: string | null;
    compensationEligible: boolean;
    completedAt: Date | null;
    createdAt: Date;
    id: string;
    publisherId: string;
    requestNote: string;
    requestedById: string;
    status: "waiting" | "in_progress" | "completed" | "cancelled";
    workId: string;
  }>,
): Promise<PublisherEditorRequestListItem[]> {
  if (records.length === 0) return [];

  const workIds = Array.from(new Set(records.map((record) => record.workId)));
  const publisherIds = Array.from(
    new Set(records.map((record) => record.publisherId)),
  );
  const userIds = Array.from(
    new Set(
      records.flatMap((record) =>
        [record.requestedById, record.assignedEditorId].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ),
  );
  const requestIds = records.map((record) => record.id);

  const [works, publishers, users, reviews] = await Promise.all([
    prisma.work.findMany({
      where: { id: { in: workIds } },
      select: {
        author: {
          select: {
            displayName: true,
            fullName: true,
          },
        },
        id: true,
        slug: true,
        title: true,
      },
    }),
    prisma.publisher.findMany({
      where: { id: { in: publisherIds } },
      select: {
        companyName: true,
        id: true,
      },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        displayName: true,
        fullName: true,
        id: true,
      },
    }),
    prisma.publisherEditorReview.findMany({
      where: { requestId: { in: requestIds } },
      select: {
        category: true,
        content: true,
        requestId: true,
        status: true,
        title: true,
      },
    }),
  ]);

  const workMap = new Map(works.map((work) => [work.id, work]));
  const publisherMap = new Map(
    publishers.map((publisher) => [publisher.id, publisher]),
  );
  const userMap = new Map(users.map((user) => [user.id, user]));
  const reviewMap = new Map(
    reviews.map((review) => [review.requestId, review]),
  );

  return records.flatMap((record) => {
    const work = workMap.get(record.workId);
    const publisher = publisherMap.get(record.publisherId);
    const requestedBy = userMap.get(record.requestedById);

    if (!work || !publisher || !requestedBy) return [];

    const assignedEditor = record.assignedEditorId
      ? userMap.get(record.assignedEditorId) ?? null
      : null;
    const review = reviewMap.get(record.id) ?? null;

    return [
      {
        assignedEditorName: assignedEditor
          ? personName(assignedEditor)
          : null,
        compensationEligible: record.compensationEligible,
        completedAt: record.completedAt?.toISOString() ?? null,
        createdAt: record.createdAt.toISOString(),
        id: record.id,
        publisherName: publisher.companyName,
        requestNote: record.requestNote,
        requestedByName: personName(requestedBy),
        review: review
          ? {
              category: review.category,
              content: review.content,
              status: review.status,
              title: review.title,
            }
          : null,
        status: record.status,
        work: {
          authorName: personName(work.author),
          id: work.id,
          slug: work.slug,
          title: work.title,
        },
      },
    ];
  });
}

export async function getActivePublisherEditorRequestWorkIds(
  publisherId: string,
  workIds: string[],
) {
  if (workIds.length === 0) return [];

  const records = await prisma.publisherEditorRequest.findMany({
    where: {
      publisherId,
      status: { in: [...activeRequestStatuses] },
      workId: { in: workIds },
    },
    select: { workId: true },
  });

  return records.map((record) => record.workId);
}

export async function getPublisherEditorRequestsForMember(userId: string) {
  const membership = await getPublisherMembership(userId);

  if (
    !membership ||
    !hasPublisherPermission(
      membership.role,
      "view_editor_requests",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  const records = await prisma.publisherEditorRequest.findMany({
    where: { publisherId: membership.publisherId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: requestRecordSelect,
  });

  return {
    adminReadOnly: isPublisherAdminReadOnlyMembership(membership),
    canCancelWaitingRequests:
      !isPublisherAdminReadOnlyMembership(membership) &&
      hasPublisherPermission(
        membership.role,
        "request_editor_review",
        membership.permissionOverrides,
      ),
    companyName: membership.publisher.companyName,
    items: await hydrateRequests(records),
  };
}

export async function createPublisherEditorRequest(input: {
  note: string;
  userId: string;
  workId: string;
}) {
  const membership = await getPublisherMembership(input.userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "request_editor_review",
      membership.permissionOverrides,
    )
  ) {
    return { status: "forbidden" as const };
  }

  const note = input.note.trim();
  if (note.length < 10 || note.length > 1000) {
    return { status: "invalid_note" as const };
  }

  const work = await prisma.work.findFirst({
    where: {
      ...eligiblePublisherEditorWorkWhere,
      id: input.workId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!work) {
    return { status: "invalid_work" as const };
  }

  const activeKey = `${membership.publisherId}:${work.id}`;

  const existing = await prisma.publisherEditorRequest.findUnique({
    where: { activeKey },
    select: { id: true },
  });

  if (existing) {
    return {
      requestId: existing.id,
      status: "already_active" as const,
    };
  }

  try {
    const request = await prisma.$transaction(async (transaction) => {
      const eligible = await lockAndValidateEligibleWork(
        transaction,
        work.id,
      );

      if (!eligible) return null;

      const created = await transaction.publisherEditorRequest.create({
        data: {
          activeKey,
          compensationEligible: true,
          publisherId: membership.publisherId,
          requestNote: note,
          requestedById: input.userId,
          status: "waiting",
          workId: work.id,
        },
        select: { id: true },
      });

      await transaction.auditLog.create({
        data: {
          action: "work_status_changed",
          actorId: input.userId,
          entityId: work.id,
          entityType: "Work",
          metadata: JSON.stringify({
            publisherEditorRequestId: created.id,
            publisherId: membership.publisherId,
            source: "publisher_editor_request_created",
          }),
        },
      });

      return created;
    });

    if (!request) {
      return { status: "invalid_work" as const };
    }

    return {
      requestId: request.id,
      status: "created" as const,
    };
  } catch (error) {
    const raced = await prisma.publisherEditorRequest.findUnique({
      where: { activeKey },
      select: { id: true },
    });

    if (raced) {
      return {
        requestId: raced.id,
        status: "already_active" as const,
      };
    }

    throw error;
  }
}

export async function cancelPublisherEditorRequest(input: {
  requestId: string;
  userId: string;
}) {
  const membership = await getPublisherMembership(input.userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "request_editor_review",
      membership.permissionOverrides,
    )
  ) {
    return { status: "forbidden" as const };
  }

  return prisma.$transaction(async (transaction) => {
    const request = await lockPublisherEditorRequest(
      transaction,
      input.requestId,
    );

    if (!request || request.publisherId !== membership.publisherId) {
      return { status: "forbidden" as const };
    }

    if (
      request.status !== "waiting" ||
      request.assignedEditorId !== null
    ) {
      return { status: "not_cancellable" as const };
    }

    const updated = await transaction.publisherEditorRequest.updateMany({
      where: {
        assignedEditorId: null,
        id: request.id,
        publisherId: membership.publisherId,
        status: "waiting",
      },
      data: {
        activeKey: null,
        status: "cancelled",
      },
    });

    if (updated.count !== 1) {
      return { status: "not_cancellable" as const };
    }

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: input.userId,
        entityId: request.workId,
        entityType: "Work",
        metadata: JSON.stringify({
          publisherEditorRequestId: request.id,
          publisherId: request.publisherId,
          source: "publisher_editor_request_cancelled",
        }),
      },
    });

    if (request.requestedById !== input.userId) {
      await transaction.notification.create({
        data: {
          message:
            "Açtığınız yayınevi editör talebi, yayınevinizde yetkili bir ekip üyesi tarafından iptal edildi.",
          relatedEntityId: request.id,
          relatedEntityType: "publisher_editor_request",
          title: "Editör talebi iptal edildi",
          type: "system",
          userId: request.requestedById,
        },
      });
    }

    return {
      requestId: request.id,
      status: "cancelled" as const,
    };
  });
}

export async function getEditorPublisherRequestLists(editorId: string) {
  const [openRecords, activeRecords, completedRecords] = await Promise.all([
    prisma.publisherEditorRequest.findMany({
      where: {
        assignedEditorId: null,
        status: "waiting",
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: requestRecordSelect,
    }),
    prisma.publisherEditorRequest.findMany({
      where: {
        assignedEditorId: editorId,
        status: "in_progress",
      },
      orderBy: { claimedAt: "desc" },
      take: 100,
      select: requestRecordSelect,
    }),
    prisma.publisherEditorRequest.findMany({
      where: {
        assignedEditorId: editorId,
        status: "completed",
      },
      orderBy: { completedAt: "desc" },
      take: 100,
      select: requestRecordSelect,
    }),
  ]);

  const [open, active, completed] = await Promise.all([
    hydrateRequests(openRecords),
    hydrateRequests(activeRecords),
    hydrateRequests(completedRecords),
  ]);

  return { active, completed, open };
}

export async function claimPublisherEditorRequest(input: {
  editorId: string;
  requestId: string;
}) {
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const request = await lockPublisherEditorRequest(
      transaction,
      input.requestId,
    );

    if (
      !request ||
      request.assignedEditorId !== null ||
      request.status !== "waiting"
    ) {
      return { status: "already_claimed" as const };
    }

    const eligible = await lockAndValidateEligibleWork(
      transaction,
      request.workId,
    );

    if (!eligible) {
      await cancelLockedIneligibleRequest(
        transaction,
        request,
        input.editorId,
      );
      return { status: "work_unavailable" as const };
    }

    const editor = await lockActiveEditor(
      transaction,
      input.editorId,
    );

    if (!editor) {
      return { status: "forbidden" as const };
    }

    const updated = await transaction.publisherEditorRequest.updateMany({
      where: {
        assignedEditorId: null,
        id: request.id,
        status: "waiting",
      },
      data: {
        assignedEditorId: editor.id,
        claimedAt: now,
        startedAt: now,
        status: "in_progress",
      },
    });

    if (updated.count !== 1) {
      throw new Error("PUBLISHER_EDITOR_REQUEST_STATE_CHANGED");
    }

    await transaction.notification.create({
      data: {
        message:
          "Yayınevi editör talebiniz bir İlkOku editörü tarafından incelemeye alındı.",
        relatedEntityId: request.id,
        relatedEntityType: "publisher_editor_request",
        title: "Editör talebiniz incelemeye alındı",
        type: "system",
        userId: request.requestedById,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: editor.id,
        entityId: request.workId,
        entityType: "Work",
        metadata: JSON.stringify({
          publisherEditorRequestId: request.id,
          publisherId: request.publisherId,
          source: "publisher_editor_request_claimed",
        }),
      },
    });

    return {
      requestId: request.id,
      status: "claimed" as const,
    };
  });
}

function validateReview(input: {
  category: string;
  content: string;
  title: string;
}) {
  const title = input.title.trim();
  const category = input.category.trim() || "genel";
  const content = input.content.trim();

  if (title.length < 3 || title.length > 160) return null;
  if (category.length < 2 || category.length > 60) return null;
  if (content.length < 20 || content.length > 10000) return null;

  return { category, content, title };
}

export async function getEditorPublisherRequestDetail(
  editorId: string,
  requestId: string,
) {
  const request = await prisma.publisherEditorRequest.findFirst({
    where: {
      assignedEditorId: editorId,
      id: requestId,
      status: { in: ["in_progress", "completed"] },
    },
    select: requestRecordSelect,
  });

  if (!request) return null;

  const [item] = await hydrateRequests([request]);
  return item ?? null;
}

export async function savePublisherEditorReviewDraft(input: {
  category: string;
  content: string;
  editorId: string;
  requestId: string;
  title: string;
}) {
  const values = validateReview(input);
  if (!values) return { status: "invalid_review" as const };

  return prisma.$transaction(async (transaction) => {
    const request = await lockPublisherEditorRequest(
      transaction,
      input.requestId,
    );

    if (
      !request ||
      request.assignedEditorId !== input.editorId ||
      request.status !== "in_progress"
    ) {
      return { status: "forbidden" as const };
    }

    const eligible = await lockAndValidateEligibleWork(
      transaction,
      request.workId,
    );

    if (!eligible) {
      await cancelLockedIneligibleRequest(
        transaction,
        request,
        input.editorId,
      );
      return { status: "work_unavailable" as const };
    }

    const editor = await lockActiveEditor(
      transaction,
      input.editorId,
    );

    if (!editor) {
      return { status: "forbidden" as const };
    }

    await transaction.publisherEditorReview.upsert({
      where: { requestId: request.id },
      create: {
        ...values,
        editorId: input.editorId,
        requestId: request.id,
        status: "draft",
      },
      update: {
        ...values,
        completedAt: null,
        editorId: input.editorId,
        status: "draft",
      },
    });

    return { status: "saved" as const };
  });
}

export async function completePublisherEditorReview(input: {
  category: string;
  content: string;
  editorId: string;
  requestId: string;
  title: string;
}) {
  const values = validateReview(input);
  if (!values) return { status: "invalid_review" as const };

  const completedAt = new Date();

  return prisma.$transaction(async (transaction) => {
    const request = await lockPublisherEditorRequest(
      transaction,
      input.requestId,
    );

    if (
      !request ||
      request.assignedEditorId !== input.editorId ||
      request.status !== "in_progress"
    ) {
      return { status: "forbidden" as const };
    }

    const eligible = await lockAndValidateEligibleWork(
      transaction,
      request.workId,
    );

    if (!eligible) {
      await cancelLockedIneligibleRequest(
        transaction,
        request,
        input.editorId,
      );
      return { status: "work_unavailable" as const };
    }

    const editor = await lockActiveEditor(
      transaction,
      input.editorId,
    );

    if (!editor) {
      return { status: "forbidden" as const };
    }

    await transaction.publisherEditorReview.upsert({
      where: { requestId: request.id },
      create: {
        ...values,
        completedAt,
        editorId: input.editorId,
        requestId: request.id,
        status: "completed",
      },
      update: {
        ...values,
        completedAt,
        editorId: input.editorId,
        status: "completed",
      },
    });

    const updated = await transaction.publisherEditorRequest.updateMany({
      where: {
        assignedEditorId: input.editorId,
        id: request.id,
        status: "in_progress",
      },
      data: {
        activeKey: null,
        completedAt,
        status: "completed",
      },
    });

    if (updated.count !== 1) {
      throw new Error("PUBLISHER_EDITOR_REQUEST_STATE_CHANGED");
    }

    await transaction.notification.create({
      data: {
        message:
          "Yayıneviniz adına açılan editör incelemesi tamamlandı. Raporu Editör Talepleri alanından görüntüleyebilirsiniz.",
        relatedEntityId: request.id,
        relatedEntityType: "publisher_editor_request",
        title: "Yayınevi editör incelemesi tamamlandı",
        type: "system",
        userId: request.requestedById,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: input.editorId,
        entityId: request.workId,
        entityType: "Work",
        metadata: JSON.stringify({
          compensationEligible: request.compensationEligible,
          publisherEditorRequestId: request.id,
          publisherId: request.publisherId,
          source: "publisher_editor_request_completed",
        }),
      },
    });

    return {
      requestId: request.id,
      status: "completed" as const,
    };
  });
}
