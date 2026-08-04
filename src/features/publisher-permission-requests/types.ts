import type {
  PublisherMemberRole,
  PublisherPermissionRequestStatus,
} from "@/generated/prisma/client";
import type { PublisherPermission } from "@/features/publisher-workspace/permissions";

export interface PublisherPermissionRequestData {
  createdAt: string;
  id: string;
  permission: PublisherPermission;
  requestNote: string | null;
  requestedByName: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  status: PublisherPermissionRequestStatus;
}

export interface PublisherPermissionCenterData {
  canReview: boolean;
  companyName: string;
  currentPermissions: PublisherPermission[];
  incomingRequests: PublisherPermissionRequestData[];
  membershipRole: PublisherMemberRole;
  missingPermissions: PublisherPermission[];
  ownRequests: PublisherPermissionRequestData[];
  pendingPermissions: PublisherPermission[];
}

export interface PublisherPermissionActionState {
  message: string;
  status: "idle" | "success" | "error";
}
