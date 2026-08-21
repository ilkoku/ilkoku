import type { UserRole } from "@/features/auth/types";

export type ContractTargetRole = UserRole | "any";
export type ContractTemplateLifecycleStatus =
  | "soft"
  | "draft"
  | "review"
  | "approved"
  | "active";
export type UserContractStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "cancelled";

export interface ContractTemplateRecord {
  active: boolean;
  body: string;
  code: string;
  createdAt: Date;
  description: string | null;
  id: string;
  targetRole: ContractTargetRole;
  title: string;
  updatedAt: Date;
  version: number;
}

export interface ContractRecipientRecord {
  displayName: string | null;
  email: string;
  fullName: string;
  id: string;
  role: UserRole;
}

export interface ContractWorkRecord {
  authorId: string;
  id: string;
  title: string;
}

export interface UserContractListRecord {
  adminNote: string | null;
  bodySnapshot: string;
  createdAt: Date;
  id: string;
  recipientEmail: string;
  recipientFullName: string;
  recipientRole: string;
  relatedWorkId: string | null;
  relatedWorkTitle: string | null;
  responseNote: string | null;
  sentAt: Date | null;
  sentByEmail: string | null;
  status: UserContractStatus;
  templateCode: string;
  templateId: string;
  templateVersion: number;
  titleSnapshot: string;
  updatedAt: Date;
  viewedAt: Date | null;
  respondedAt: Date | null;
}

export interface UserContractEventRecord {
  actorEmail: string | null;
  actorName: string | null;
  createdAt: Date;
  eventType: string;
  id: string;
  metadata: string | null;
}

export interface LegacyPublisherContractRecord {
  authorEmail: string;
  authorName: string;
  createdAt: Date;
  id: string;
  publisherName: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  updatedAt: Date;
  version: number;
  workTitle: string;
}
