import { cache } from "react";
import {
  getCustomizablePublisherPermissions,
  hasPublisherPermission,
} from "./permissions";
import {
  getPublisherMembership,
  getPublisherInvitations,
  getPublisherMembers,
  getPublisherNotifications,
  getPublisherSubmissionForMember,
  getPublisherWorkspaceRecords,
} from "./repository";
import {
  getLegacyPublisherFiles,
} from "@/features/publisher-submissions/legacy-security";
import type {
  PublisherSubmissionDetail,
  PublisherFileData,
  PublisherInvitationData,
  PublisherMemberData,
  PublisherNotificationData,
  PublisherWorkspaceData,
  PublisherWorkspaceFilters,
} from "./types";

const displayName = (person: { displayName: string | null; fullName: string }) =>
  person.displayName?.trim() || person.fullName.trim() || "İsimsiz kullanıcı";

export function normalizePublisherFilters(input: Record<string, string | string[] | undefined>): PublisherWorkspaceFilters {
  const value = (key: string) => {
    const raw = input[key];
    return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  };
  const page = Number(value("sayfa"));
  return {
    contract: value("sozlesme"),
    dateFrom: value("baslangic"),
    dateTo: value("bitis"),
    editor: value("editor"),
    genre: value("tur"),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    plan: value("plan"),
    query: value("arama").slice(0, 160),
    status: value("durum"),
  };
}

export const getPublisherWorkspace = cache(
  async (userId: string, filters: PublisherWorkspaceFilters): Promise<PublisherWorkspaceData | null> => {
    const result = await getPublisherWorkspaceRecords(userId, filters);
    if (!result) return null;
    const [pending, reviewing, accepted, rejected, contractPending, planCreated] = result.counts;

    return {
      activities: result.activities.map((event) => ({
        actorName: event.actor ? displayName(event.actor) : null,
        createdAt: event.createdAt.toISOString(),
        detail: event.detail,
        id: event.id,
        title: event.title,
        type: event.type,
      })),
      companyName: result.membership.publisher.companyName,
      counts: { accepted, contractPending, pending, planCreated, rejected, reviewing },
      filters: { ...filters, page: result.page },
      genres: result.genres,
      membershipRole: result.membership.role,
      pageCount: result.pageCount,
      publisherId: result.membership.publisherId,
      resultCount: result.resultCount,
      submissions: result.records.map((submission) => ({
        author: { displayName: displayName(submission.author), id: submission.author.id },
        contractStatus: submission.contract?.status ?? null,
        coverLetter: submission.coverLetter,
        editorReviewStatus: submission.work.editorReviewStatus,
        genre: submission.work.genre,
        id: submission.id,
        publicationPlanStatus: submission.publicationPlan?.status ?? null,
        status: submission.status,
        submittedAt: submission.submittedAt.toISOString(),
        updatedAt: submission.updatedAt.toISOString(),
        work: { id: submission.work.id, title: submission.work.title },
      })),
    };
  },
);

export async function getPublisherFileCenter(userId: string): Promise<PublisherFileData[] | null> {
  const files = await getLegacyPublisherFiles(userId);
  if (!files) return null;
  return files.map((file) => ({
    category: file.category,
    createdAt: file.createdAt.toISOString(),
    fileName: file.fileName,
    id: file.id,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes.toString(),
    submissionId: file.submission.id,
    uploaderName: file.uploadedBy ? displayName(file.uploadedBy) : null,
    workTitle: file.submission.work.title,
  }));
}

export async function getPublisherNotificationCenter(userId: string): Promise<PublisherNotificationData[] | null> {
  const notifications = await getPublisherNotifications(userId);
  if (!notifications) return null;
  return notifications.map((notification) => ({
    createdAt: notification.createdAt.toISOString(),
    href:
      notification.relatedEntityType === "publisher_submission" &&
      notification.relatedEntityId
        ? `/yayinevi/basvurular/${notification.relatedEntityId}`
        : notification.relatedEntityType === "publisher_permission_request"
          ? "/yayinevi/yetkilerim"
          : null,
    id: notification.id,
    message: notification.message,
    readAt: notification.readAt?.toISOString() ?? null,
    title: notification.title,
  }));
}

export async function getPublisherMemberCenter(userId: string): Promise<{
  canManage: boolean;
  companyName: string;
  invitations: PublisherInvitationData[];
  members: PublisherMemberData[];
} | null> {
  const result = await getPublisherMembers(userId);

  if (!result) return null;

  const canManage = hasPublisherPermission(
    result.membership.role,
    "manage_members",
    result.membership.permissionOverrides,
  );

  const invitations = canManage
    ? await getPublisherInvitations(userId)
    : [];

  return {
    canManage,
    companyName: result.membership.publisher.companyName,
    invitations: (invitations ?? []).map((invitation) => ({
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      acceptedByName: invitation.acceptedBy
        ? displayName(invitation.acceptedBy)
        : null,
      cancelledAt: invitation.cancelledAt?.toISOString() ?? null,
      createdAt: invitation.createdAt.toISOString(),
      declinedAt: invitation.declinedAt?.toISOString() ?? null,
      expiresAt: invitation.expiresAt.toISOString(),
      id: invitation.id,
      invitedByName: displayName(invitation.invitedBy),
      invitedEmail: invitation.invitedEmail,
      permissions: getCustomizablePublisherPermissions(
        invitation.role,
        invitation.permissionOverrides,
      ),
      role: invitation.role,
      status: invitation.status,
    })),
    members: result.members
      .filter((member) => canManage || member.userId === userId)
      .map((member) => ({
      active: member.active,
      displayName: displayName(member.user),
      email: member.user.email,
      id: member.id,
      permissions: getCustomizablePublisherPermissions(
        member.role,
        member.permissionOverrides,
      ),
        role: member.role,
      })),
  };
}

export const getPublisherSubmissionDetail = cache(
  async (userId: string, submissionId: string): Promise<PublisherSubmissionDetail | null> => {
    const [submission, membership] = await Promise.all([
      getPublisherSubmissionForMember(userId, submissionId),
      getPublisherMembership(userId),
    ]);

    if (
      !submission ||
      !membership ||
      membership.publisherId !== submission.publisherId ||
      !hasPublisherPermission(
        membership.role,
        "view_submission",
        membership.permissionOverrides,
      )
    ) {
      return null;
    }

    const canViewFiles = hasPublisherPermission(
      membership.role,
      "view_files",
      membership.permissionOverrides,
    );
    const canDownloadFiles = hasPublisherPermission(
      membership.role,
      "download_files",
      membership.permissionOverrides,
    );
    const canViewAuthorizedPassport = hasPublisherPermission(
      membership.role,
      "view_authorized_passport",
      membership.permissionOverrides,
    );
    const canViewAuthorizedContent = hasPublisherPermission(
      membership.role,
      "view_authorized_content",
      membership.permissionOverrides,
    );

    return {
      author: { displayName: displayName(submission.author), email: submission.author.email, id: submission.author.id },
      contract: submission.contract ? {
        advanceAmount: submission.contract.advanceAmount?.toString() ?? null,
        id: submission.contract.id,
        notes: submission.contract.notes,
        rightsPeriodMonths: submission.contract.rightsPeriodMonths,
        royaltyPercentage: submission.contract.royaltyPercentage.toString(),
        status: submission.contract.status,
        territory: submission.contract.territory,
        version: submission.contract.version,
      } : null,
      coverLetter: submission.coverLetter,
      events: [
        ...submission.events.map((event) => ({
          actorName: event.actor ? displayName(event.actor) : null,
          createdAt: event.createdAt.toISOString(),
          detail: event.detail,
          id: event.id,
          title: event.title,
          type: event.type,
        })),
        {
          actorName: displayName(submission.author),
          createdAt: submission.submittedAt.toISOString(),
          detail: submission.coverLetter,
          id: `submitted-${submission.id}`,
          title: "Eser yayınevine gönderildi",
          type: "submitted" as const,
        },
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      files: canViewFiles
        ? submission.files.map((file) => ({
            category: file.category,
            createdAt: file.createdAt.toISOString(),
            fileName: file.fileName,
            id: file.id,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes.toString(),
            submissionId: submission.id,
            uploaderName: file.uploadedBy ? displayName(file.uploadedBy) : null,
            workTitle: submission.work.title,
          }))
        : [],
      id: submission.id,
      membershipRole: membership.role,
      permissions: {
        addInternalNote: hasPublisherPermission(
          membership.role,
          "add_internal_note",
          membership.permissionOverrides,
        ),
        decide: hasPublisherPermission(
          membership.role,
          "decide_submission",
          membership.permissionOverrides,
        ),
        downloadFiles: canDownloadFiles,
        manageContract: hasPublisherPermission(
          membership.role,
          "manage_contract",
          membership.permissionOverrides,
        ),
        managePublicationPlan: hasPublisherPermission(
          membership.role,
          "manage_publication_plan",
          membership.permissionOverrides,
        ),
        viewAuthorizedContent: canViewAuthorizedContent,
        viewAuthorizedPassport: canViewAuthorizedPassport,
        viewFiles: canViewFiles,
      },
      publisher: { companyName: submission.publisher.companyName, id: submission.publisher.id },
      publicationPlan: submission.publicationPlan ? {
        coverStatus: submission.publicationPlan.coverStatus,
        id: submission.publicationPlan.id,
        isbn: submission.publicationPlan.isbn,
        layoutStatus: submission.publicationPlan.layoutStatus,
        notes: submission.publicationPlan.notes,
        printRun: submission.publicationPlan.printRun,
        status: submission.publicationPlan.status,
        targetPublicationDate: submission.publicationPlan.targetPublicationDate?.toISOString() ?? null,
      } : null,
      publisherNote: submission.publisherNote,
      status: submission.status,
      submittedAt: submission.submittedAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
      work: {
        chapterCount: submission.work.chapters.length,
        description: submission.work.description,
        editorReviewStatus: submission.work.editorReviewStatus,
        feedback: canViewAuthorizedContent
          ? submission.work.editorFeedback.map((feedback) => ({
              category: feedback.category,
              content: feedback.content,
              editorName: displayName(feedback.editor),
              id: feedback.id,
              stage: feedback.assignment?.stage ?? null,
              title: feedback.title,
            }))
          : [],
        genre: submission.work.genre,
        id: submission.work.id,
        slug: submission.work.slug,
        title: submission.work.title,
      },
    };
  },
);
