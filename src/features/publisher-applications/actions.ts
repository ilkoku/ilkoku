"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  toPublisherApplicationData,
  validatePublisherApplicationFormData,
} from "./schema";
import type { PublisherApplicationActionState } from "./state";

type RoleRequestLockRow = {
  id: string;
};

export async function completePublisherApplicationAction(
  _previousState: PublisherApplicationActionState,
  formData: FormData,
): Promise<PublisherApplicationActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      message: "Başvuruyu güncellemek için yeniden giriş yapın.",
      status: "error",
    };
  }

  const validation = validatePublisherApplicationFormData(formData);

  if (!validation.success) {
    return { message: validation.message, status: "error" };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const lockedRequests = await transaction.$queryRaw<RoleRequestLockRow[]>`
        SELECT id
        FROM RoleRequest
        WHERE userId = ${user.id}
          AND requestedRole = 'publisher'
          AND status = 'pending'
        ORDER BY createdAt ASC
        LIMIT 1
        FOR UPDATE
      `;

      const lockedRequestId = lockedRequests[0]?.id;

      if (!lockedRequestId) {
        throw new Error("PUBLISHER_ROLE_REQUEST_NOT_FOUND");
      }

      const roleRequest = await transaction.roleRequest.findFirst({
        where: {
          id: lockedRequestId,
          requestedRole: "publisher",
          status: "pending",
          userId: user.id,
        },
        select: { id: true },
      });

      if (!roleRequest) {
        throw new Error("PUBLISHER_ROLE_REQUEST_NOT_FOUND");
      }

      await transaction.publisherApplication.upsert({
        where: { roleRequestId: roleRequest.id },
        create: {
          ...toPublisherApplicationData(validation.data),
          applicantUserId: user.id,
          roleRequestId: roleRequest.id,
          submittedAt: new Date(),
          verificationStatus: "submitted",
        },
        update: {
          ...toPublisherApplicationData(validation.data),
          correctionNote: null,
          submittedAt: new Date(),
          verificationStatus: "submitted",
        },
      });

      await transaction.user.updateMany({
        where: {
          id: user.id,
          role: "publisher",
          publisherMemberships: { none: { active: true } },
        },
        data: { role: "reader" },
      });
    });
  } catch (applicationError) {
    console.error("PUBLISHER_APPLICATION_UPDATE_FAILED", {
      code: applicationError instanceof Error
        ? applicationError.message
        : "UNKNOWN_ERROR",
      userId: user.id,
    });

    return {
      message: "Kurumsal başvuru kaydedilemedi. Lütfen yeniden deneyin.",
      status: "error",
    };
  }

  revalidatePath("/hesabim");
  revalidatePath("/admin/roller");

  return {
    message: "Kurumsal bilgileriniz inceleme için yeniden gönderildi.",
    status: "success",
  };
}