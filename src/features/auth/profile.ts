import { authContent } from "@/content";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { UserRole } from "./types";

export interface AuthProfile {
  avatarUrl: string | null;
  fullName: string;
  id: string;
  role: UserRole;
}

const validRoles: UserRole[] = ["reader", "writer", "editor", "publisher"];

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const user = await getCurrentUser();
  if (!user || !validRoles.includes(user.role as UserRole)) return null;

  return {
    avatarUrl: user.avatarUrl,
    fullName: user.fullName || user.email.split("@")[0] || authContent.common.fallbackUserName,
    id: user.id,
    role: user.role as UserRole,
  };
}
