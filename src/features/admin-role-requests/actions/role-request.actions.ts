"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    throw new Error("ADMIN_PERMISSION_REQUIRED");
  }

  return user;
}

function requestIdFrom(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "").trim();

  if (!requestId) {
    throw new Error("ROLE_REQUEST_ID_REQUIRED");
  }

  return requestId;
}

function reviewNoteFrom(formData: FormData) {
  const value = String(formData.get("reviewNote") ?? "").trim();

  if (value.length > 2000) {
    throw new Error("REVIEW_NOTE_TOO_LONG");
  }

  return value || null;
}

function revalidateRolePages() {
  revalidatePath("/admin");
  revalidatePath("/admin/roller");
  revalidatePath("/rol-secimi");
  revalidatePath("/editor-paneli");
  revalidatePath("/yayinevi");
  revalidatePath("/yazar");
}

export async function approveRoleRequestAction(
  formData: FormData,
): Promise<void> {
  try {
    const admin = await requireAdmin();
    const requestId = requestIdFrom(formData);
    const reviewNote = reviewNoteFrom(formData);

    const roleRequest = await prisma.roleRequest.findFirst({
      where: {
        id: requestId,
        status: "pending",
      },
      select: {
        id: true,
        requestedRole: true,
        userId: true,
      },
    });

    if (!roleRequest) {
      throw new Error(
        "Başvuru bulunamadı veya daha önce sonuçlandırılmış.",
      );
    }

    if (
      roleRequest.requestedRole !== "editor" &&
      roleRequest.requestedRole !== "publisher" &&
      roleRequest.requestedRole !== "writer"
    ) {
      throw new Error("Bu rol başvurusu onaylanamaz.");
    }

    await prisma.$transaction(async (transaction) => {
      const updatedRequest = await transaction.roleRequest.updateMany({
        where: {
          id: roleRequest.id,
          status: "pending",
        },
        data: {
          reviewedAt: new Date(),
          reviewedById: admin.id,
          reviewNote,
          status: "approved",
        },
      });

      if (updatedRequest.count !== 1) {
        throw new Error("ROLE_REQUEST_ALREADY_REVIEWED");
      }

      await transaction.user.update({
        where: {
          id: roleRequest.userId,
        },
        data: {
          role: roleRequest.requestedRole,
        },
      });

      await transaction.auditLog.create({
        data: {
          action: "role_request_reviewed",
          actorId: admin.id,
          entityId: roleRequest.id,
          entityType: "RoleRequest",
          metadata: JSON.stringify({
            decision: "approved",
            requestedRole: roleRequest.requestedRole,
            userId: roleRequest.userId,
          }),
        },
      });
    });

    revalidateRolePages();

    return;
  } catch (error) {
    console.error("approveRoleRequestAction", error);

    throw new Error("Başvuru onaylanırken bir hata oluştu.");
  }
}

export async function rejectRoleRequestAction(
  formData: FormData,
): Promise<void> {
  try {
    const admin = await requireAdmin();
    const requestId = requestIdFrom(formData);
    const reviewNote = reviewNoteFrom(formData);

    const roleRequest = await prisma.roleRequest.findFirst({
      where: {
        id: requestId,
        status: "pending",
      },
      select: {
        id: true,
        requestedRole: true,
        userId: true,
      },
    });

    if (!roleRequest) {
      throw new Error(
        "Başvuru bulunamadı veya daha önce sonuçlandırılmış.",
      );
    }

    const updatedRequest = await prisma.roleRequest.updateMany({
      where: {
        id: roleRequest.id,
        status: "pending",
      },
      data: {
        reviewedAt: new Date(),
        reviewedById: admin.id,
        reviewNote,
        status: "rejected",
      },
    });

    if (updatedRequest.count !== 1) {
      throw new Error(
        "Başvuru başka bir yönetici tarafından sonuçlandırılmış.",
      );
    }

    await prisma.auditLog.create({
      data: {
        action: "role_request_reviewed",
        actorId: admin.id,
        entityId: roleRequest.id,
        entityType: "RoleRequest",
        metadata: JSON.stringify({
          decision: "rejected",
          requestedRole: roleRequest.requestedRole,
          userId: roleRequest.userId,
        }),
      },
    });

    revalidateRolePages();

    return;
  } catch (error) {
    console.error("rejectRoleRequestAction", error);

    throw new Error("Başvuru reddedilirken bir hata oluştu.");
  }
}
