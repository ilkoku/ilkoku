import { createHash } from "node:crypto";
import { getCurrentAdminRoleView } from "@/features/admin-role-view/cookie";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type {
  EditorReviewStatus,
  Prisma,
  PublisherMemberRole,
  PublisherSubmissionStatus,
} from "@/generated/prisma/client";
import {
  getCustomizablePublisherPermissions,
  hasPublisherPermission,
  type PublisherPermission,
} from "./permissions";
import type { PublisherWorkspaceFilters, PublisherWorkspaceSubmissionStatus } from "./types";

const PAGE_SIZE = 10;

interface PublisherWorkspaceRecord {
  author: { displayName: string | null; fullName: string; id: string };
  contract: { status: "draft" | "sent" | "accepted" | "rejected" } | null;
  coverLetter: string;
  id: string;
  publicationPlan: { status: "planning" | "preproduction" | "production" | "distribution" | "published" } | null;
  status: PublisherWorkspaceSubmissionStatus;
  submittedAt: Date;
  updatedAt: Date;
  work: {
    editorReviewStatus: "not_requested" | "requested" | "in_progress" | "awaiting_second_editor" | "second_in_progress" | "completed";
    genre: string | null;
    id: string;
    title: string;
  };
}

export function isPublisherAdminReadOnlyMembership(
  membership: unknown,
): membership is { adminReadOnly: true } {
  return Boolean(
    membership &&
    typeof membership === "object" &&
    "adminReadOnly" in membership &&
    membership.adminReadOnly === true,
  );
}

export async function getPublisherMembership(
  userId: string,
) {
  const session = await getCurrentSessionContext();

  if (
    session?.user.id === userId &&
    session.user.role === "admin"
  ) {
    const roleView = await getCurrentAdminRoleView();

    if (
      roleView?.role === "publisher" &&
      roleView.publisherId &&
      roleView.publisherRole
    ) {
      const publisher =
        await prisma.publisher.findFirst({
          where: {
            active: true,
            archivedAt: null,
            id: roleView.publisherId,
            verified: true,
          },
        });

      if (!publisher) return null;

      return {
        active: true,
        adminReadOnly: true as const,
        createdAt: publisher.createdAt,
        id:
          `admin-preview:${publisher.id}:` +
          roleView.publisherRole,
        permissionOverrides: null,
        publisher,
        publisherId: publisher.id,
        role: roleView.publisherRole,
        updatedAt: publisher.updatedAt,
        userId,
      };
    }
  }

  return prisma.publisherMembership.findFirst({
    where: {
      active: true,
      userId,
      publisher: {
        active: true,
        archivedAt: null,
        verified: true,
      },
    },
    include: {
      publisher: true,
    },
  });
}

export async function requirePublisherMembershipPermission(
  userId: string,
  permission: PublisherPermission,
) {
  const membership = await getPublisherMembership(userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      permission,
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  return membership;
}

export async function getPublisherWorkspaceRecords(
  userId: string,
  filters: PublisherWorkspaceFilters,
) {
  const membership = await getPublisherMembership(userId);
  if (
    !membership ||
    !hasPublisherPermission(
      membership.role,
      "view_submission",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;
  const statusFilter: PublisherSubmissionStatus | { in: PublisherSubmissionStatus[] } | undefined = filters.status === "completed"
    ? { in: ["accepted", "rejected"] }
    : ["pending", "reviewing", "accepted", "rejected", "withdrawn"].includes(filters.status)
      ? filters.status as PublisherSubmissionStatus
      : undefined;

  const activeEditorStatuses: EditorReviewStatus[] = ["requested", "in_progress", "awaiting_second_editor", "second_in_progress"];
  const where: Prisma.PublisherSubmissionWhereInput = {
    archivedAt: null,
    publisherId: membership.publisherId,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(dateFrom || dateTo ? {
      submittedAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    } : {}),
    ...(filters.genre ? { work: { genre: filters.genre } } : {}),
    ...(filters.editor === "completed" ? { work: { editorReviewStatus: "completed" as const } } : {}),
    ...(filters.editor === "active" ? {
      work: { editorReviewStatus: { in: activeEditorStatuses } },
    } : {}),
    ...(filters.editor === "none" ? { work: { editorReviewStatus: "not_requested" as const } } : {}),
    ...(filters.contract === "none" ? { contract: { is: null } } : {}),
    ...(filters.contract && filters.contract !== "none" ? { contract: { is: { status: filters.contract as "draft" | "sent" | "accepted" | "rejected" } } } : {}),
    ...(filters.plan === "none" ? { publicationPlan: { is: null } } : {}),
    ...(filters.plan === "exists" ? { publicationPlan: { isNot: null } } : {}),
    ...(filters.plan && !["none", "exists"].includes(filters.plan) ? {
      publicationPlan: { is: { status: filters.plan as "planning" | "preproduction" | "production" | "distribution" | "published" } },
    } : {}),
  };

  const [records, counts, activities, genreRecords] = await Promise.all([
    prisma.publisherSubmission.findMany({
      where,
      select: {
        author: { select: { displayName: true, fullName: true, id: true } },
        contract: { select: { status: true } },
        coverLetter: true,
        id: true,
        publicationPlan: { select: { status: true } },
        status: true,
        submittedAt: true,
        updatedAt: true,
        work: { select: { editorReviewStatus: true, genre: true, id: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    Promise.all([
      prisma.publisherSubmission.count({ where: { archivedAt: null, publisherId: membership.publisherId, status: "pending" } }),
      prisma.publisherSubmission.count({ where: { archivedAt: null, publisherId: membership.publisherId, status: "reviewing" } }),
      prisma.publisherSubmission.count({ where: { archivedAt: null, publisherId: membership.publisherId, status: "accepted" } }),
      prisma.publisherSubmission.count({ where: { archivedAt: null, publisherId: membership.publisherId, status: "rejected" } }),
      prisma.publisherSubmission.count({ where: { archivedAt: null, publisherId: membership.publisherId, status: "accepted", contract: { is: null } } }),
      prisma.publisherSubmission.count({ where: { archivedAt: null, publisherId: membership.publisherId, publicationPlan: { isNot: null } } }),
    ]),
    prisma.publisherSubmissionEvent.findMany({
      where: { submission: { archivedAt: null, publisherId: membership.publisherId } },
      include: { actor: { select: { displayName: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.work.findMany({
      where: { publisherSubmissions: { some: { archivedAt: null, publisherId: membership.publisherId } } },
      distinct: ["genre"],
      select: { genre: true },
      orderBy: { genre: "asc" },
    }),
  ]);

  const normalizedQuery = filters.query.toLocaleLowerCase("tr-TR");
  const workspaceRecords = records as PublisherWorkspaceRecord[];
  const matching = normalizedQuery
    ? workspaceRecords.filter((record) => {
        const author = record.author.displayName || record.author.fullName;
        return record.work.title.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
          || author.toLocaleLowerCase("tr-TR").includes(normalizedQuery);
      })
    : workspaceRecords;
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);

  return {
    activities,
    counts,
    genres: genreRecords.map((item) => item.genre).filter((genre): genre is string => Boolean(genre)),
    membership,
    page,
    pageCount,
    records: matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    resultCount: matching.length,
  };
}

export async function getPublisherSubmissionForMember(
  userId: string,
  submissionId: string,
) {
  const membership =
    await getPublisherMembership(userId);

  if (
    !membership ||
    !hasPublisherPermission(
      membership.role,
      "view_submission",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  return prisma.publisherSubmission.findFirst({
    where: {
      archivedAt: null,
      id: submissionId,
      publisherId: membership.publisherId,
      publisher: {
        active: true,
        archivedAt: null,
      },
    },
    include: {
      contract: true,
      publicationPlan: true,
      author: {
        select: {
          displayName: true,
          email: true,
          fullName: true,
          id: true,
        },
      },
      events: {
        include: {
          actor: {
            select: {
              displayName: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      files: {
        where: {
          archivedAt: null,
        },
        include: {
          uploadedBy: {
            select: {
              displayName: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      publisher: true,
      work: {
        include: {
          chapters: {
            where: {
              archivedAt: null,
            },
            select: {
              id: true,
            },
          },
          editorFeedback: {
            where: {
              archivedAt: null,
              isProfessionalReview: true,
            },
            include: {
              assignment: {
                select: {
                  stage: true,
                },
              },
              editor: {
                select: {
                  displayName: true,
                  fullName: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });
}

export async function upsertPublisherContract(input: {
  advanceAmount: number | null; notes: string | null; rightsPeriodMonths: number;
  royaltyPercentage: number; status: "draft" | "sent"; submissionId: string;
  territory: string; userId: string;
}) {
  const membership = await requirePublisherMembershipPermission(input.userId, "manage_contract");
  if (!membership) return null;
  const submission = await prisma.publisherSubmission.findFirst({
    where: { id: input.submissionId, archivedAt: null, status: "accepted", publisherId: membership.publisherId },
    select: {
      author: {
        select: {
          email: true,
          fullName: true,
        },
      },
      authorId: true,
      id: true,
      work: {
        select: {
          title: true,
        },
      },
    },
  });
  if (!submission) return null;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.publishingContract.findUnique({ where: { submissionId: submission.id } });
    const contract = await tx.publishingContract.upsert({
      where: { submissionId: submission.id },
      create: { advanceAmount: input.advanceAmount, createdById: input.userId, notes: input.notes, rightsPeriodMonths: input.rightsPeriodMonths, royaltyPercentage: input.royaltyPercentage, sentAt: input.status === "sent" ? new Date() : null, status: input.status, submissionId: submission.id, territory: input.territory },
      update: { advanceAmount: input.advanceAmount, notes: input.notes, rightsPeriodMonths: input.rightsPeriodMonths, royaltyPercentage: input.royaltyPercentage, sentAt: input.status === "sent" ? new Date() : existing?.sentAt, status: input.status, territory: input.territory, version: { increment: 1 } },
    });
    await tx.publisherSubmissionEvent.create({
      data: { actorId: input.userId, detail: input.notes, metadata: JSON.stringify({ contractId: contract.id, status: input.status, version: contract.version }), submissionId: submission.id, title: input.status === "sent" ? "Sözleşme yazara gönderildi" : "Sözleşme taslağı güncellendi", type: "contract_requested" },
    });
    await tx.notification.create({
      data: {
        message: `${submission.work.title} eseriniz için sözleşme ${input.status === "sent" ? "size gönderildi" : "taslağı güncellendi"}.`,
        relatedEntityId: submission.id,
        relatedEntityType: "publisher_submission",
        title: input.status === "sent" ? "Sözleşme gönderildi" : "Sözleşme güncellendi",
        type: "system",
        userId: submission.authorId,
      },
    });
    return {
      author: submission.author,
      contract,
      work: submission.work,
    };
  });
}

export async function upsertPublicationPlan(input: {
  coverStatus: "not_started" | "in_progress" | "completed"; isbn: string | null;
  layoutStatus: "not_started" | "in_progress" | "completed"; notes: string | null;
  printRun: number | null; status: "planning" | "preproduction" | "production" | "distribution" | "published";
  submissionId: string; targetPublicationDate: Date | null; userId: string;
}) {
  const membership = await requirePublisherMembershipPermission(input.userId, "manage_publication_plan");
  if (!membership) return null;
  const submission = await prisma.publisherSubmission.findFirst({
    where: { id: input.submissionId, archivedAt: null, status: "accepted", publisherId: membership.publisherId },
    select: { authorId: true, id: true, work: { select: { title: true } } },
  });
  if (!submission) return null;
  return prisma.$transaction(async (tx) => {
    const plan = await tx.publicationPlan.upsert({
      where: { submissionId: submission.id },
      create: { coverStatus: input.coverStatus, isbn: input.isbn, layoutStatus: input.layoutStatus, notes: input.notes, printRun: input.printRun, status: input.status, submissionId: submission.id, targetPublicationDate: input.targetPublicationDate },
      update: { coverStatus: input.coverStatus, isbn: input.isbn, layoutStatus: input.layoutStatus, notes: input.notes, printRun: input.printRun, status: input.status, targetPublicationDate: input.targetPublicationDate },
    });
    await tx.notification.create({
      data: {
        message: `${submission.work.title} eseriniz için yayın planı güncellendi.`,
        relatedEntityId: submission.id,
        relatedEntityType: "publisher_submission",
        title: "Yayın planı güncellendi",
        type: "system",
        userId: submission.authorId,
      },
    });
    return plan;
  });
}

export async function getPublisherFiles(
  userId: string,
) {
  const membership =
    await getPublisherMembership(userId);

  if (
    !membership ||
    !hasPublisherPermission(
      membership.role,
      "download_file",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  return prisma.publisherFile.findMany({
    where: {
      archivedAt: null,
      submission: {
        archivedAt: null,
        publisherId: membership.publisherId,
      },
    },
    include: {
      submission: {
        select: {
          id: true,
          work: {
            select: {
              title: true,
            },
          },
        },
      },
      uploadedBy: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPublisherFileForDownload(
  userId: string,
  fileId: string,
) {
  const membership =
    await getPublisherMembership(userId);

  if (
    !membership ||
    isPublisherAdminReadOnlyMembership(membership) ||
    !hasPublisherPermission(
      membership.role,
      "download_file",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  return prisma.publisherFile.findFirst({
    where: {
      archivedAt: null,
      id: fileId,
      submission: {
        archivedAt: null,
        publisherId: membership.publisherId,
      },
    },
    select: {
      fileName: true,
      storageUrl: true,
    },
  });
}

export async function getPublisherNotifications(
  userId: string,
) {
  const membership =
    await getPublisherMembership(userId);

  if (!membership) return null;

  if (
    isPublisherAdminReadOnlyMembership(membership)
  ) {
    return [];
  }

  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

export async function getPublisherMembers(userId: string) {
  const membership = await getPublisherMembership(userId);
  if (!membership) return null;
  const members = await prisma.publisherMembership.findMany({
    where: { publisherId: membership.publisherId },
    include: { user: { select: { displayName: true, email: true, fullName: true } } },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });
  return { membership, members };
}

export async function updatePublisherMember(input: {
  active: boolean;
  memberId: string;
  permissions: PublisherPermission[];
  role: "manager" | "submissions_manager" | "editorial" | "contract_manager" | "reviewer" | "viewer";
  userId: string;
}) {
  const caller = await requirePublisherMembershipPermission(input.userId, "manage_members");
  if (!caller) return null;
  const target = await prisma.publisherMembership.findFirst({
    where: { id: input.memberId, publisherId: caller.publisherId },
    select: { id: true, role: true, userId: true },
  });
  if (!target || target.role === "owner" || target.userId === input.userId) return null;
  return prisma.publisherMembership.update({
    where: { id: target.id },
    data: {
      active: input.active,
      permissionOverrides: input.permissions,
      role: input.role,
    },
  });
}

type InviteablePublisherRole = Exclude<PublisherMemberRole, "owner">;

export async function createPublisherInvitation(input: {
  email: string;
  expiresAt: Date;
  permissions: PublisherPermission[];
  role: InviteablePublisherRole;
  tokenHash: string;
  userId: string;
}) {
  const caller = await requirePublisherMembershipPermission(
    input.userId,
    "manage_members",
  );

  if (!caller) {
    return { status: "forbidden" as const };
  }

  const email = input.email.trim().toLowerCase();
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    await transaction.publisherInvitation.updateMany({
      where: {
        expiresAt: { lte: now },
        invitedEmail: email,
        publisherId: caller.publisherId,
        status: "pending",
      },
      data: {
        status: "expired",
      },
    });

    const existingUser = await transaction.user.findUnique({
      where: { email },
      select: {
        deletedAt: true,
        id: true,
        status: true,
      },
    });

    if (
      existingUser &&
      !existingUser.deletedAt &&
      existingUser.status === "active"
    ) {
      const existingMembership =
        await transaction.publisherMembership.findUnique({
          where: {
            publisherId_userId: {
              publisherId: caller.publisherId,
              userId: existingUser.id,
            },
          },
          select: { id: true },
        });

      if (existingMembership) {
        return { status: "already_member" as const };
      }
    }

    const pendingInvitation =
      await transaction.publisherInvitation.findFirst({
        where: {
          expiresAt: { gt: now },
          invitedEmail: email,
          publisherId: caller.publisherId,
          status: "pending",
        },
        select: { id: true },
      });

    if (pendingInvitation) {
      return { status: "already_pending" as const };
    }

    const invitation = await transaction.publisherInvitation.create({
      data: {
        expiresAt: input.expiresAt,
        invitedById: caller.userId,
        invitedEmail: email,
        permissionOverrides: input.permissions,
        publisherId: caller.publisherId,
        role: input.role,
        tokenHash: input.tokenHash,
      },
      select: {
        createdAt: true,
        expiresAt: true,
        id: true,
        invitedEmail: true,
        permissionOverrides: true,
        role: true,
      },
    });

    return {
      existingUserId:
        existingUser &&
        !existingUser.deletedAt &&
        existingUser.status === "active"
          ? existingUser.id
          : null,
      invitation,
      publisherName: caller.publisher.companyName,
      status: "created" as const,
    };
  });
}

export async function getPublisherInvitations(
  userId: string,
) {
  const membership =
    await getPublisherMembership(userId);

  if (
    !membership ||
    !hasPublisherPermission(
      membership.role,
      "manage_members",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  const now = new Date();

  if (
    !isPublisherAdminReadOnlyMembership(membership)
  ) {
    await prisma.publisherInvitation.updateMany({
      where: {
        expiresAt: {
          lte: now,
        },
        publisherId: membership.publisherId,
        status: "pending",
      },
      data: {
        status: "expired",
      },
    });
  }

  return prisma.publisherInvitation.findMany({
    where: {
      publisherId: membership.publisherId,
    },
    include: {
      acceptedBy: {
        select: {
          displayName: true,
          email: true,
          fullName: true,
        },
      },
      invitedBy: {
        select: {
          displayName: true,
          email: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

export async function cancelPublisherInvitation(input: {
  invitationId: string;
  userId: string;
}) {
  const caller = await requirePublisherMembershipPermission(
    input.userId,
    "manage_members",
  );

  if (!caller) return false;

  const result = await prisma.publisherInvitation.updateMany({
    where: {
      id: input.invitationId,
      publisherId: caller.publisherId,
      status: "pending",
    },
    data: {
      cancelledAt: new Date(),
      status: "cancelled",
    },
  });

  return result.count === 1;
}

export async function getPublisherInvitationByToken(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken) return null;

  const tokenHash = createHash("sha256")
    .update(normalizedToken)
    .digest("hex");

  const invitation = await prisma.publisherInvitation.findUnique({
    where: { tokenHash },
    include: {
      invitedBy: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
      publisher: {
        select: {
          companyName: true,
          id: true,
        },
      },
    },
  });

  if (!invitation) return null;

  if (
    invitation.status === "pending" &&
    invitation.expiresAt <= new Date()
  ) {
    return prisma.publisherInvitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
      include: {
        invitedBy: {
          select: {
            displayName: true,
            fullName: true,
          },
        },
        publisher: {
          select: {
            companyName: true,
            id: true,
          },
        },
      },
    });
  }

  return invitation;
}

export async function acceptPublisherInvitation(input: {
  token: string;
  userId: string;
}) {
  const normalizedToken = input.token.trim();

  if (!normalizedToken) {
    return { status: "invalid" as const };
  }

  const tokenHash = createHash("sha256")
    .update(normalizedToken)
    .digest("hex");

  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: input.userId },
      select: {
        deletedAt: true,
        email: true,
        id: true,
        status: true,
      },
    });

    if (
      !user ||
      user.deletedAt ||
      user.status !== "active"
    ) {
      return { status: "invalid_user" as const };
    }

    const invitation =
      await transaction.publisherInvitation.findFirst({
        where: {
          expiresAt: { gt: now },
          publisher: {
            active: true,
            archivedAt: null,
            verified: true,
          },
          status: "pending",
          tokenHash,
        },
        select: {
          id: true,
          invitedEmail: true,
          permissionOverrides: true,
          publisherId: true,
          role: true,
        },
      });

    if (!invitation) {
      return { status: "invalid" as const };
    }

    if (
      invitation.invitedEmail.trim().toLowerCase() !==
      user.email.trim().toLowerCase()
    ) {
      return {
        invitedEmail: invitation.invitedEmail,
        status: "email_mismatch" as const,
      };
    }

    const claimed =
      await transaction.publisherInvitation.updateMany({
        where: {
          expiresAt: { gt: now },
          id: invitation.id,
          status: "pending",
        },
        data: {
          acceptedAt: now,
          acceptedById: user.id,
          status: "accepted",
        },
      });

    if (claimed.count !== 1) {
      return { status: "invalid" as const };
    }

    const invitationPermissions =
      getCustomizablePublisherPermissions(
        invitation.role,
        invitation.permissionOverrides,
      );

    const existingMembership =
      await transaction.publisherMembership.findUnique({
        where: {
          publisherId_userId: {
            publisherId: invitation.publisherId,
            userId: user.id,
          },
        },
        select: {
          role: true,
        },
      });

    await transaction.publisherMembership.upsert({
      where: {
        publisherId_userId: {
          publisherId: invitation.publisherId,
          userId: user.id,
        },
      },
      create: {
        active: true,
        permissionOverrides: invitationPermissions,
        publisherId: invitation.publisherId,
        role: invitation.role,
        userId: user.id,
      },
      update:
        existingMembership?.role === "owner"
          ? {
              active: true,
              role: "owner",
            }
          : {
              active: true,
              permissionOverrides: invitationPermissions,
              role: invitation.role,
            },
    });

    return {
      publisherId: invitation.publisherId,
      status: "accepted" as const,
    };
  });
}

export { PAGE_SIZE };
