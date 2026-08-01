import type { UserRole } from "./types";
import { prisma } from "@/lib/prisma";
import { getPublisherMembership } from "@/features/publisher-workspace/repository";
import { getWorkspaceDestination, roleDestinations } from "./data";

const roleRequestHref = "/hesabim?sekme=rol-basvurusu";

export async function getRoleNavigation(user: { id: string; role: UserRole }) {
  const [pendingRequest, publisherMembership] = await Promise.all([
    prisma.roleRequest.findFirst({
      where: {
        requestedRole: { in: ["editor", "publisher"] },
        status: "pending",
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, requestedRole: true },
    }),
    user.role === "admin"
      ? Promise.resolve(null)
      : getPublisherMembership(user.id),
  ]);

  const hasPendingRequest =
    Boolean(pendingRequest) || user.role === "editor_pending";

  const workspaceHref = publisherMembership
    ? roleDestinations.publisher
    : getWorkspaceDestination(user.role);

  return {
    destination: hasPendingRequest ? roleRequestHref : workspaceHref,
    hasPendingRequest,
    pendingRequest,
    workspaceHref,
  };
}

export async function getAuthenticatedDestination(user: { id: string; role: UserRole }) {
  return (await getRoleNavigation(user)).destination;
}
