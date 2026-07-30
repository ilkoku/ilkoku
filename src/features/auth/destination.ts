import type { UserRole } from "./types";
import { prisma } from "@/lib/prisma";
import { getWorkspaceDestination, roleDestinations } from "./data";

const roleRequestHref = "/hesabim?sekme=rol-basvurusu";

export async function getRoleNavigation(user: { id: string; role: UserRole }) {
  const pendingRequest = await prisma.roleRequest.findFirst({
    where: {
      requestedRole: { in: ["editor", "publisher"] },
      status: "pending",
      userId: user.id,
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, requestedRole: true },
  });

  const hasPendingRequest = Boolean(pendingRequest) || user.role === "editor_pending";

  return {
    destination: hasPendingRequest ? roleRequestHref : roleDestinations[user.role],
    hasPendingRequest,
    pendingRequest,
    workspaceHref: getWorkspaceDestination(user.role),
  };
}

export async function getAuthenticatedDestination(user: { id: string; role: UserRole }) {
  return (await getRoleNavigation(user)).destination;
}
