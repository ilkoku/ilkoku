import { authContent } from "@/content";
import { readAdminRoleView } from "@/features/admin-role-view/cookie";
import type {
  AdminPublisherViewRole,
  AdminRoleViewRole,
} from "@/features/admin-role-view/config";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import type { UserRole } from "./types";

export interface AdminPublisherViewContext {
  publisherId: string;
  role: AdminPublisherViewRole;
}

export interface AuthProfile {
  actualRole: UserRole;
  adminPublisherView: AdminPublisherViewContext | null;
  adminRoleView: AdminRoleViewRole | null;
  avatarUrl: string | null;
  fullName: string;
  id: string;
  role: UserRole;
}

const validRoles: UserRole[] = [
  "reader",
  "writer",
  "editor_pending",
  "editor",
  "publisher",
  "admin",
];

export async function getCurrentProfile(
  options: { ignoreAdminRoleView?: boolean } = {},
): Promise<AuthProfile | null> {
  const context = await getCurrentSessionContext();

  if (!context) {
    return null;
  }

  const user = context.user;

  if (!user || !validRoles.includes(user.role as UserRole)) {
    return null;
  }

  const actualRole = user.role as UserRole;
  const roleView =
    actualRole === "admin" && !options.ignoreAdminRoleView
      ? await readAdminRoleView({
          sessionId: context.sessionId,
          userRole: actualRole,
        })
      : null;

  const adminPublisherView =
    roleView?.role === "publisher" &&
    roleView.publisherId &&
    roleView.publisherRole
      ? {
          publisherId: roleView.publisherId,
          role: roleView.publisherRole,
        }
      : null;

  return {
    actualRole,
    adminPublisherView,
    adminRoleView: roleView?.role ?? null,
    avatarUrl: user.avatarUrl,
    fullName:
      user.fullName ||
      user.email.split("@")[0] ||
      authContent.common.fallbackUserName,
    id: user.id,
    role: roleView?.role ?? actualRole,
  };
}
