import type {
  PublisherFileCategory,
  PublisherInvitationStatus,
  PublisherMemberRole,
} from "@/generated/prisma/client";
import type { PublisherPermission } from "./permissions";

export type PublisherWorkspaceSubmissionStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type PublisherSubmissionEventType =
  | "submitted"
  | "review_started"
  | "decision_changed"
  | "internal_note"
  | "contract_requested";

export interface PublisherSubmissionTimelineEvent {
  actorName: string | null;
  createdAt: string;
  detail: string | null;
  id: string;
  title: string;
  type: PublisherSubmissionEventType;
}

export interface PublisherWorkspaceSubmission {
  author: { displayName: string; id: string };
  contractStatus: string | null;
  coverLetter: string;
  editorReviewStatus: string;
  genre: string | null;
  id: string;
  publicationPlanStatus: string | null;
  status: PublisherWorkspaceSubmissionStatus;
  submittedAt: string;
  updatedAt: string;
  work: { id: string; title: string };
}

export interface PublisherWorkspaceFilters {
  contract: string;
  dateFrom: string;
  dateTo: string;
  editor: string;
  genre: string;
  page: number;
  plan: string;
  query: string;
  status: string;
}

export interface PublisherWorkspaceData {
  activities: PublisherSubmissionTimelineEvent[];
  companyName: string;
  counts: {
    accepted: number;
    contractPending: number;
    pending: number;
    planCreated: number;
    rejected: number;
    reviewing: number;
  };
  filters: PublisherWorkspaceFilters;
  genres: string[];
  membershipRole: PublisherMemberRole;
  pageCount: number;
  publisherId: string;
  resultCount: number;
  submissions: PublisherWorkspaceSubmission[];
}

export interface PublisherFileData {
  category: PublisherFileCategory;
  createdAt: string;
  fileName: string;
  id: string;
  mimeType: string;
  sizeBytes: string;
  submissionId: string;
  uploaderName: string | null;
  workTitle: string;
}

export interface PublisherInvitationData {
  acceptedAt: string | null;
  acceptedByName: string | null;
  cancelledAt: string | null;
  createdAt: string;
  declinedAt: string | null;
  expiresAt: string;
  id: string;
  invitedByName: string;
  invitedEmail: string;
  permissions: PublisherPermission[];
  role: PublisherMemberRole;
  status: PublisherInvitationStatus;
}

export interface PublisherMemberData {
  active: boolean;
  displayName: string;
  email: string;
  id: string;
  permissions: PublisherPermission[];
  role: PublisherMemberRole;
}

export interface PublisherNotificationData {
  createdAt: string;
  href: string | null;
  id: string;
  message: string;
  readAt: string | null;
  title: string;
}

export interface PublisherSubmissionDetail {
  author: { displayName: string; email: string; id: string };
  contract: PublisherContractData | null;
  coverLetter: string;
  events: PublisherSubmissionTimelineEvent[];
  files: PublisherFileData[];
  id: string;
  membershipRole: PublisherMemberRole;
  permissions: {
    addInternalNote: boolean;
    decide: boolean;
    manageContract: boolean;
    managePublicationPlan: boolean;
  };
  publisher: { companyName: string; id: string };
  publicationPlan: PublisherPublicationPlanData | null;
  publisherNote: string | null;
  status: PublisherWorkspaceSubmissionStatus;
  submittedAt: string;
  updatedAt: string;
  work: {
    chapterCount: number;
    description: string | null;
    editorReviewStatus: string;
    feedback: Array<{
      category: string;
      content: string;
      editorName: string;
      id: string;
      stage: "first" | "second" | null;
      title: string;
    }>;
    genre: string | null;
    id: string;
    slug: string;
    title: string;
  };
}

export interface PublisherActionState {
  message: string;
  status: "idle" | "success" | "error";
}

export type PublisherDecisionActionState = PublisherActionState;
export type PublisherInternalNoteActionState = PublisherActionState;
export type PublisherContractActionState = PublisherActionState;

export type PublishingContractStatus = "draft" | "sent" | "accepted" | "rejected";
export type PublicationPlanStatus = "planning" | "preproduction" | "production" | "distribution" | "published";
export type ProductionTaskStatus = "not_started" | "in_progress" | "completed";

export interface PublisherContractData {
  advanceAmount: string | null;
  id: string;
  notes: string | null;
  rightsPeriodMonths: number;
  royaltyPercentage: string;
  status: PublishingContractStatus;
  territory: string;
  version: number;
}

export interface PublisherPublicationPlanData {
  coverStatus: ProductionTaskStatus;
  id: string;
  isbn: string | null;
  layoutStatus: ProductionTaskStatus;
  notes: string | null;
  printRun: number | null;
  status: PublicationPlanStatus;
  targetPublicationDate: string | null;
}
