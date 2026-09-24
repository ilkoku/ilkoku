"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const deletionTargets = ["writer", "editor", "work", "publisher"] as const;
type DeletionTarget = (typeof deletionTargets)[number];

const DELETE_CONFIRMATION = "SİL";
const DELETION_CENTER_PATH = "/sistem-yonetimi/silme-merkezi";

async function requireAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/giris?sonraki=${encodeURIComponent(DELETION_CENTER_PATH)}`);
  }

  if (currentUser.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=admin");
  }

  return currentUser;
}

function normalizeConfirmation(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLocaleUpperCase("tr-TR");
}

function isDeletionTarget(value: string): value is DeletionTarget {
  return deletionTargets.includes(value as DeletionTarget);
}

function revalidateDeletionViews() {
  for (const path of [
    "/admin",
    "/admin/arsiv",
    "/admin/kullanicilar",
    "/admin/yazarlar",
    "/admin/editorler",
    "/admin/yayinevleri",
    "/admin/eserler",
    "/admin/silme-merkezi",
    "/admin/audit-log",
  ]) {
    revalidatePath(path);
  }
}

function deletionResult(status: string) {
  redirect(`${DELETION_CENTER_PATH}?durum=${encodeURIComponent(status)}`);
}

export async function deleteFromAdminCenterAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");

  if (
    !targetId ||
    !isDeletionTarget(targetType) ||
    normalizeConfirmation(formData.get("confirmation")) !== DELETE_CONFIRMATION
  ) {
    deletionResult("onay-gerekli");
  }

  const result = await prisma.$transaction(async (transaction) => {
    if (targetType === "writer") {
      const target = await transaction.user.findUnique({
        where: { id: targetId },
        select: {
          deletedAt: true,
          id: true,
          publicId: true,
          role: true,
          status: true,
        },
      });

      if (!target || target.role !== "writer" || target.deletedAt) {
        return { ok: false, reason: "kayit-bulunamadi" } as const;
      }

      const protectedWorks = await transaction.work.count({
        where: {
          authorId: target.id,
          OR: [
            { entitlements: { some: { status: "active" } } },
            { commerceOrders: { some: { status: "paid" } } },
          ],
        },
      });

      if (protectedWorks > 0) {
        return { ok: false, reason: "yazar-ucretli-erisim-korumali" } as const;
      }

      const now = new Date();

      await transaction.user.update({
        where: { id: target.id },
        data: {
          deletedAt: now,
          status: "disabled",
        },
      });

      await transaction.session.deleteMany({
        where: { userId: target.id },
      });

      await transaction.auditLog.create({
        data: {
          action: "user_status_changed",
          actorId: currentUser.id,
          entityId: target.id,
          entityType: "user",
          metadata: JSON.stringify({
            deletedAt: now.toISOString(),
            newStatus: "disabled",
            oldStatus: target.status,
            publicId: target.publicId,
            role: target.role,
            sessionsRevoked: true,
            source: "admin_deletion_center",
          }),
        },
      });

      return { ok: true, reason: "yazar-silindi" } as const;
    }

    if (targetType === "editor") {
      const target = await transaction.user.findUnique({
        where: { id: targetId },
        select: {
          deletedAt: true,
          id: true,
          publicId: true,
          role: true,
          status: true,
        },
      });

      if (!target || target.role !== "editor" || target.deletedAt) {
        return { ok: false, reason: "kayit-bulunamadi" } as const;
      }

      const [activeAssignments, activePublisherRequests] = await Promise.all([
        transaction.editorReviewAssignment.count({
          where: {
            editorId: target.id,
            status: { in: ["waiting", "assigned", "in_progress"] },
          },
        }),
        transaction.publisherEditorRequest.count({
          where: {
            assignedEditorId: target.id,
            status: { in: ["waiting", "in_progress"] },
          },
        }),
      ]);

      if (activeAssignments > 0 || activePublisherRequests > 0) {
        return { ok: false, reason: "editor-aktif-inceleme" } as const;
      }

      const now = new Date();

      await transaction.user.update({
        where: { id: target.id },
        data: {
          deletedAt: now,
          status: "disabled",
        },
      });

      await transaction.session.deleteMany({
        where: { userId: target.id },
      });

      await transaction.auditLog.create({
        data: {
          action: "user_status_changed",
          actorId: currentUser.id,
          entityId: target.id,
          entityType: "user",
          metadata: JSON.stringify({
            deletedAt: now.toISOString(),
            newStatus: "disabled",
            oldStatus: target.status,
            publicId: target.publicId,
            role: target.role,
            sessionsRevoked: true,
            source: "admin_deletion_center",
          }),
        },
      });

      return { ok: true, reason: "editor-silindi" } as const;
    }

    if (targetType === "work") {
      const target = await transaction.work.findUnique({
        where: { id: targetId },
        select: {
          archivedAt: true,
          id: true,
          publicId: true,
          status: true,
        },
      });

      if (!target || target.archivedAt || target.status === "archived") {
        return { ok: false, reason: "kayit-bulunamadi" } as const;
      }

      const [activeEntitlements, paidOrders] = await Promise.all([
        transaction.workEntitlement.count({
          where: { workId: target.id, status: "active" },
        }),
        transaction.order.count({
          where: { workId: target.id, status: "paid" },
        }),
      ]);

      if (activeEntitlements > 0 || paidOrders > 0) {
        return { ok: false, reason: "eser-ucretli-erisim-korumali" } as const;
      }

      const now = new Date();

      await transaction.work.update({
        where: { id: target.id },
        data: {
          archivedAt: now,
          status: "archived",
        },
      });

      await transaction.auditLog.create({
        data: {
          action: "work_status_changed",
          actorId: currentUser.id,
          entityId: target.id,
          entityType: "work",
          metadata: JSON.stringify({
            archivedAt: now.toISOString(),
            mode: "delete_center_archive",
            newStatus: "archived",
            oldStatus: target.status,
            publicId: target.publicId,
            source: "admin_deletion_center",
          }),
        },
      });

      return { ok: true, reason: "eser-silindi" } as const;
    }

    const target = await transaction.publisher.findUnique({
      where: { id: targetId },
      select: {
        active: true,
        archivedAt: true,
        id: true,
        publicId: true,
      },
    });

    if (!target || target.archivedAt) {
      return { ok: false, reason: "kayit-bulunamadi" } as const;
    }

    const now = new Date();

    await transaction.publisher.update({
      where: { id: target.id },
      data: {
        active: false,
        archivedAt: now,
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "publisher_status_changed",
        actorId: currentUser.id,
        entityId: target.id,
        entityType: "publisher",
        metadata: JSON.stringify({
          archivedAt: now.toISOString(),
          mode: "delete_center_archive",
          newActive: false,
          oldActive: target.active,
          publicId: target.publicId,
          source: "admin_deletion_center",
        }),
      },
    });

    return { ok: true, reason: "yayinevi-silindi" } as const;
  });

  revalidateDeletionViews();
  deletionResult(result.reason);
}
