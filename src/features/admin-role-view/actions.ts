"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  adminRoleViewDestinations,
  isAdminPublisherViewRole,
  isAdminRoleViewRole,
} from "./config";
import {
  clearAdminRoleViewCookie,
  readAdminRoleView,
  setAdminPublisherRoleViewCookie,
  setAdminRoleViewCookie,
} from "./cookie";

async function requireAdminContext() {
  const context = await getCurrentSessionContext();

  if (!context || context.user.role !== "admin") {
    throw new Error("ADMIN_ROLE_VIEW_UNAUTHORIZED");
  }

  return context;
}

async function currentView(
  context: Awaited<
    ReturnType<typeof requireAdminContext>
  >,
) {
  return readAdminRoleView({
    sessionId: context.sessionId,
    userRole: "admin",
  });
}

async function auditViewChange(input: {
  actorId: string;
  fromPublisherId?: string | null;
  fromPublisherRole?: string | null;
  fromRole: string;
  publisherId?: string | null;
  publisherRole?: string | null;
  sessionId: string;
  source: "account" | "publisher_detail";
  toRole: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: "admin_role_view_changed",
        actorId: input.actorId,
        entityId: input.publisherId ?? input.sessionId,
        entityType: input.publisherId
          ? "Publisher"
          : "Session",
        metadata: JSON.stringify({
          fromPublisherId: input.fromPublisherId ?? null,
          fromPublisherRole:
            input.fromPublisherRole ?? null,
          fromRole: input.fromRole,
          publisherId: input.publisherId ?? null,
          publisherRole: input.publisherRole ?? null,
          source: input.source,
          toRole: input.toRole,
        }),
      },
    });
  } catch (error) {
    console.error(
      "ADMIN_ROLE_VIEW_AUDIT_FAILED",
      error,
    );
  }
}

export async function setAdminRoleViewAction(
  formData: FormData,
) {
  const context = await requireAdminContext();
  const requestedRole = String(
    formData.get("role") ?? "",
  );
  const current = await currentView(context);

  if (requestedRole === "publisher") {
    await clearAdminRoleViewCookie();
    revalidatePath("/hesabim");
    redirect("/admin/yayinevleri");
  }

  if (requestedRole === "admin") {
    await auditViewChange({
      actorId: context.user.id,
      fromPublisherId: current?.publisherId,
      fromPublisherRole: current?.publisherRole,
      fromRole: current?.role ?? "admin",
      sessionId: context.sessionId,
      source: "account",
      toRole: "admin",
    });

    await clearAdminRoleViewCookie();
    revalidatePath("/hesabim");
    revalidatePath("/admin/yayinevleri");
    redirect("/admin");
  }

  if (!isAdminRoleViewRole(requestedRole)) {
    throw new Error("ADMIN_ROLE_VIEW_INVALID_ROLE");
  }

  await auditViewChange({
    actorId: context.user.id,
    fromPublisherId: current?.publisherId,
    fromPublisherRole: current?.publisherRole,
    fromRole: current?.role ?? "admin",
    sessionId: context.sessionId,
    source: "account",
    toRole: requestedRole,
  });

  await setAdminRoleViewCookie(
    requestedRole,
    context.sessionId,
  );

  revalidatePath("/hesabim");
  redirect(adminRoleViewDestinations[requestedRole]);
}

export async function setAdminPublisherRoleViewAction(
  formData: FormData,
) {
  const context = await requireAdminContext();
  const publisherId = String(
    formData.get("publisherId") ?? "",
  ).trim();
  const publisherRole = String(
    formData.get("publisherRole") ?? "",
  ).trim();

  if (
    !publisherId ||
    !isAdminPublisherViewRole(publisherRole)
  ) {
    throw new Error(
      "ADMIN_PUBLISHER_ROLE_VIEW_INVALID_CONTEXT",
    );
  }

  const publisher = await prisma.publisher.findFirst({
    where: {
      active: true,
      archivedAt: null,
      id: publisherId,
      verified: true,
    },
    select: {
      id: true,
    },
  });

  if (!publisher) {
    throw new Error(
      "ADMIN_PUBLISHER_ROLE_VIEW_PUBLISHER_UNAVAILABLE",
    );
  }

  const current = await currentView(context);

  await auditViewChange({
    actorId: context.user.id,
    fromPublisherId: current?.publisherId,
    fromPublisherRole: current?.publisherRole,
    fromRole: current?.role ?? "admin",
    publisherId: publisher.id,
    publisherRole,
    sessionId: context.sessionId,
    source: "publisher_detail",
    toRole: "publisher",
  });

  await setAdminPublisherRoleViewCookie({
    publisherId: publisher.id,
    publisherRole,
    sessionId: context.sessionId,
  });

  revalidatePath(
    `/admin/yayinevleri/${publisher.id}`,
  );
  redirect("/yayinevi");
}
