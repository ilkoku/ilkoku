"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const standardRoles = [
  "reader",
  "writer",
] as const;

const statuses = [
  "active",
  "suspended",
  "disabled",
] as const;

async function requireAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/giris?sonraki=/admin");
  }

  if (currentUser.role !== "admin") {
    redirect(
      "/erisim-reddedildi?kaynak=admin",
    );
  }

  return currentUser;
}

function revalidateAdminViews(publicId?: string) {
  for (const path of [
    "/admin",
    "/admin/arsiv",
    "/admin/kullanicilar",
    "/admin/okuyucular",
    "/admin/yazarlar",
    "/admin/editorler",
    "/admin/yayinevleri",
    "/admin/eserler",
    "/admin/yorumlar",
    "/admin/audit-log",
  ]) {
    revalidatePath(path);
  }

  if (publicId) {
    revalidatePath(
      `/admin/kullanicilar/${publicId}`,
    );
  }
}

export async function updateUserRoleAction(
  formData: FormData,
) {
  const currentUser = await requireAdmin();

  const userId = String(
    formData.get("userId") ?? "",
  );

  const role = String(
    formData.get("role") ?? "",
  ) as (typeof standardRoles)[number];

  if (!userId || !standardRoles.includes(role)) {
    return;
  }

  if (userId === currentUser.id) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidateAdminViews();
}

export async function updateUserStatusAction(
  formData: FormData,
) {
  const currentUser = await requireAdmin();

  const userId = String(
    formData.get("userId") ?? "",
  );

  const status = String(
    formData.get("status") ?? "",
  ) as (typeof statuses)[number];

  if (!userId || !statuses.includes(status)) {
    return;
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      publicId: true,
      role: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!target) {
    return;
  }

  if (
    target.id === currentUser.id &&
    status !== "active"
  ) {
    return;
  }

  if (
    target.role === "admin" &&
    status !== "active"
  ) {
    const activeAdmins = await prisma.user.count({
      where: {
        deletedAt: null,
        role: "admin",
        status: "active",
      },
    });

    if (activeAdmins <= 1) {
      return;
    }
  }

  if (
    target.status === status &&
    !(status === "active" && target.deletedAt)
  ) {
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: target.id },
      data: {
        status,
        ...(status === "active"
          ? { deletedAt: null }
          : {}),
      },
    });

    if (status !== "active") {
      await transaction.session.deleteMany({
        where: { userId: target.id },
      });
    }

    await transaction.auditLog.create({
      data: {
        action: "user_status_changed",
        actorId: currentUser.id,
        entityId: target.id,
        entityType: "user",
        metadata: JSON.stringify({
          newStatus: status,
          oldStatus: target.status,
          publicId: target.publicId,
          sessionsRevoked: status !== "active",
        }),
      },
    });
  });

  revalidateAdminViews(target.publicId);
}

export async function updateWorkArchiveStatusAction(
  formData: FormData,
) {
  const currentUser = await requireAdmin();

  const workId = String(
    formData.get("workId") ?? "",
  );

  const mode = String(
    formData.get("mode") ?? "",
  );

  if (
    !workId ||
    !["archive", "restore"].includes(mode)
  ) {
    return;
  }

  const target = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      publicId: true,
      status: true,
    },
  });

  if (!target) {
    return;
  }

  const nextStatus =
    mode === "archive"
      ? "archived"
      : "draft";

  await prisma.$transaction(async (transaction) => {
    await transaction.work.update({
      where: { id: target.id },
      data: {
        archivedAt:
          mode === "archive"
            ? new Date()
            : null,
        status: nextStatus,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: currentUser.id,
        entityId: target.id,
        entityType: "work",
        metadata: JSON.stringify({
          mode,
          newStatus: nextStatus,
          oldStatus: target.status,
          publicId: target.publicId,
        }),
      },
    });
  });

  revalidateAdminViews();
  revalidatePath(`/admin/eserler/${target.id}`);
}

export async function updatePublisherArchiveStatusAction(
  formData: FormData,
) {
  const currentUser = await requireAdmin();

  const publisherId = String(
    formData.get("publisherId") ?? "",
  );

  const mode = String(
    formData.get("mode") ?? "",
  );

  if (
    !publisherId ||
    !["archive", "restore"].includes(mode)
  ) {
    return;
  }

  const target = await prisma.publisher.findUnique({
    where: { id: publisherId },
    select: {
      id: true,
      publicId: true,
      active: true,
    },
  });

  if (!target) {
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.publisher.update({
      where: { id: target.id },
      data: {
        active: mode === "restore",
        archivedAt:
          mode === "archive"
            ? new Date()
            : null,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "publisher_status_changed",
        actorId: currentUser.id,
        entityId: target.id,
        entityType: "publisher",
        metadata: JSON.stringify({
          mode,
          newActive: mode === "restore",
          oldActive: target.active,
          publicId: target.publicId,
        }),
      },
    });
  });

  revalidateAdminViews();
  revalidatePath(
    `/admin/yayinevleri/${target.id}`,
  );
}

export async function updateCommentModerationAction(
  formData: FormData,
) {
  const currentUser = await requireAdmin();

  const commentId = String(
    formData.get("commentId") ?? "",
  );

  const status = String(
    formData.get("status") ?? "",
  );

  if (
    !commentId ||
    !["visible", "reported", "hidden"].includes(status)
  ) {
    return;
  }

  const target = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      publicId: true,
      status: true,
    },
  });

  if (!target) {
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.comment.update({
      where: { id: target.id },
      data: {
        status:
          status as "visible" | "reported" | "hidden",
        ...(status === "visible"
          ? { deletedAt: null }
          : {}),
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "comment_status_changed",
        actorId: currentUser.id,
        entityId: target.id,
        entityType: "comment",
        metadata: JSON.stringify({
          newStatus: status,
          oldStatus: target.status,
          publicId: target.publicId,
        }),
      },
    });
  });

  revalidateAdminViews();
}
