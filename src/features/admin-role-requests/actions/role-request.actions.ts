"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { allocatePublicId } from "@/lib/public-id";
import { prisma } from "@/lib/prisma";
import {
  sendRoleRequestDecisionEmail,
} from "@/lib/email/publisher-emails";
import { validateStoredPublisherApplication } from "@/features/publisher-applications/schema";

export interface RoleRequestActionState {
  code?: string;
  message: string;
  status: "idle" | "success" | "error";
}

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    throw new Error("ADMIN_UNAUTHORIZED");
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

function rejectionNoteFrom(formData: FormData) {
  const value = reviewNoteFrom(formData);

  if (!value || value.length < 5) {
    throw new Error("REJECTION_NOTE_REQUIRED");
  }

  return value;
}

function confirmationFrom(formData: FormData) {
  if (formData.get("confirmation") !== "confirmed") {
    throw new Error("DECISION_CONFIRMATION_REQUIRED");
  }
}

function publisherApprovalFrom(formData: FormData) {
  return {
    mode: String(formData.get("publisherMode") ?? "new").trim(),
    publisherId: String(formData.get("publisherId") ?? "").trim(),
  };
}

function createPublisherSlug(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR")
    .replaceAll("ç", "c").replaceAll("ğ", "g").replaceAll("ı", "i")
    .replaceAll("ö", "o").replaceAll("ş", "s").replaceAll("ü", "u")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180);
}

function revalidateRolePages() {
  revalidatePath("/admin");
  revalidatePath("/admin/roller");
  revalidatePath("/rol-secimi");
  revalidatePath("/editor-paneli");
  revalidatePath("/editor");
  revalidatePath("/yayinevi");
  revalidatePath("/yazar");
  revalidatePath("/hesabim");
  revalidatePath("/erisim-reddedildi");
}

function actionErrorMessage(code: string, decision: "approve" | "correction" | "reject") {
  const messages: Record<string, string> = {
    ADMIN_PERMISSION_REQUIRED: "Bu işlem yalnızca yöneticiler tarafından yapılabilir.",
    ADMIN_UNAUTHORIZED: "Bu işlem yalnızca yöneticiler tarafından yapılabilir.",
    DATABASE_ERROR: "Veritabanı işlemi tamamlanamadı. Hiçbir değişiklik uygulanmadı.",
    DECISION_CONFIRMATION_REQUIRED: "Kararı uygulamadan önce teyit alanını işaretleyin.",
    INVALID_REQUEST_ROLE: "Bu başvuru yayınevi onay akışıyla işlenemez.",
    MEMBERSHIP_CONFLICT: "Kullanıcı zaten başka bir yayınevine bağlı.",
    PUBLISHER_APPLICATION_INCOMPLETE: "Kurumsal başvuru bilgileri eksik veya henüz incelemeye gönderilmemiş.",
    PUBLISHER_MEMBERSHIP_REQUIRED: "Yayınevi üyeliği doğrulanamadığı için rol değiştirilmedi.",
    PUBLISHER_NAME_REQUIRED: "Başvuruda geçerli bir yayınevi adı bulunmuyor.",
    PUBLISHER_NOT_FOUND: "Seçilen yayınevi bulunamadı veya etkin değil.",
    PUBLISHER_REQUIRED: "Bağlanacak yayınevini seçin.",
    PUBLISHER_SELECTION_REQUIRED: "Yeni veya mevcut yayınevi seçeneğini belirleyin.",
    PUBLISHER_SLUG_CONFLICT: "Bu ad veya slug ile bir yayınevi zaten mevcut. Mevcut yayıneviyle eşleştirme seçeneğini kullanın.",
    REJECTION_NOTE_REQUIRED: "Ret gerekçesi en az 5 karakter olmalıdır.",
    REQUEST_ALREADY_REVIEWED: "Bu başvuru daha önce sonuçlandırılmış.",
    REQUEST_NOT_FOUND: "Başvuru bulunamadı.",
    REVIEW_NOTE_TOO_LONG: "Yönetici notu 2.000 karakterden uzun olamaz.",
    ROLE_REQUEST_ALREADY_REVIEWED: "Bu başvuru başka bir işlemde zaten sonuçlandırılmış.",
    ROLE_REQUEST_ID_REQUIRED: "İşlenecek başvuru belirlenemedi.",
    ROLE_REQUEST_NOT_FOUND: "Başvuru bulunamadı.",
    ROLE_REQUEST_NOT_PENDING: "Başvuru bulunamadı veya daha önce sonuçlandırılmış.",
    UNSUPPORTED_ROLE_REQUEST: "Bu rol başvurusu mevcut ürün kurallarıyla işlenemiyor.",
  };

  if (messages[code]) return messages[code];
  if (decision === "approve") {
    return "Başvuru onaylanamadı. Hiçbir rol veya üyelik değişikliği uygulanmadı.";
  }
  if (decision === "correction") {
    return "Düzeltme isteği kaydedilemedi. Başvuru durumu değiştirilmedi.";
  }
  return "Başvuru reddedilirken bir hata oluştu. Başvuru durumu değiştirilmedi.";
}

function actionErrorCode(error: unknown) {
  if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) {
    return error.message;
  }
  if (
    typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2002"
  ) {
    return "PUBLISHER_SLUG_CONFLICT";
  }
  return "DATABASE_ERROR";
}

function errorState(
  error: unknown,
  decision: "approve" | "correction" | "reject",
): RoleRequestActionState {
  const code = actionErrorCode(error);
  return {
    ...(process.env.NODE_ENV !== "production" ? { code } : {}),
    message: actionErrorMessage(code, decision),
    status: "error",
  };
}

type RoleRequestEmailDecision =
  | "approved"
  | "changes_requested"
  | "rejected";

async function sendRoleRequestDecisionEmailSafely(input: {
  decision: RoleRequestEmailDecision;
  note?: string | null;
  requestId: string;
}) {
  const request =
    await prisma.roleRequest.findUnique({
      where: {
        id: input.requestId,
      },
      select: {
        requestedRole: true,
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

  if (
    !request ||
    (
      request.requestedRole !== "editor" &&
      request.requestedRole !== "publisher"
    )
  ) {
    return;
  }

  try {
    await sendRoleRequestDecisionEmail({
      decision: input.decision,
      email: request.user.email,
      fullName: request.user.fullName,
      note: input.note,
      requestedRole: request.requestedRole,
    });
  } catch (error) {
    console.error(
      "ROLE_REQUEST_EMAIL_FAILED",
      {
        decision: input.decision,
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
        requestId: input.requestId,
      },
    );
  }
}

export async function approveRoleRequestAction(
  _previousState: RoleRequestActionState,
  formData: FormData,
): Promise<RoleRequestActionState> {
  let requestId = "";

  try {
    const admin = await requireAdmin();
    requestId = requestIdFrom(formData);
    const reviewNote = reviewNoteFrom(formData);
    const publisherApproval = publisherApprovalFrom(formData);

    confirmationFrom(formData);

    await prisma.$transaction(async (transaction) => {
      const roleRequest = await transaction.roleRequest.findUnique({
        where: { id: requestId },
        include: {
          publisherApplication: true,
          user: {
            select: {
              id: true,
              publisherMemberships: {
                where: { active: true },
                select: { publisherId: true },
              },
            },
          },
        },
      });

      if (!roleRequest) throw new Error("REQUEST_NOT_FOUND");
      if (roleRequest.status !== "pending") {
        throw new Error("REQUEST_ALREADY_REVIEWED");
      }
      if (
        roleRequest.requestedRole !== "editor"
        && roleRequest.requestedRole !== "publisher"
        && roleRequest.requestedRole !== "writer"
      ) {
        throw new Error("INVALID_REQUEST_ROLE");
      }

      let publisherId: string | null = null;

      if (roleRequest.requestedRole === "publisher") {
        const application = roleRequest.publisherApplication;
        if (
          !application
          || application.verificationStatus !== "submitted"
          || !validateStoredPublisherApplication(application).success
        ) {
          throw new Error("PUBLISHER_APPLICATION_INCOMPLETE");
        }

        const publisherName = application.publisherName.trim();
        const publisherSlug = createPublisherSlug(publisherName);
        if (publisherName.length < 2 || !publisherSlug) {
          throw new Error("PUBLISHER_NAME_REQUIRED");
        }
        if (
          publisherApproval.mode !== "existing"
          && publisherApproval.mode !== "new"
        ) {
          throw new Error("PUBLISHER_SELECTION_REQUIRED");
        }

        if (publisherApproval.mode === "existing") {
          if (!publisherApproval.publisherId) {
            throw new Error("PUBLISHER_REQUIRED");
          }
          const publisher = await transaction.publisher.findFirst({
            where: { active: true, archivedAt: null, id: publisherApproval.publisherId },
            select: { id: true },
          });
          if (!publisher) throw new Error("PUBLISHER_NOT_FOUND");
          publisherId = publisher.id;
        } else {
          const duplicate = await transaction.publisher.findFirst({
            where: {
              OR: [
                { companyName: publisherName },
                { slug: publisherSlug },
              ],
            },
            select: { id: true },
          });
          if (duplicate) throw new Error("PUBLISHER_SLUG_CONFLICT");

          const publisherCreatedAt = new Date();
          const publisherPublicId = await allocatePublicId(
            transaction,
            "publisher",
            publisherCreatedAt,
          );

          const publisher = await transaction.publisher.create({
            data: {
              acceptsSubmissions: application.acceptsSubmissions,
              createdAt: publisherCreatedAt,
              publicId: publisherPublicId,
              active: true,
              address: application.address,
              city: application.city,
              companyName: publisherName,
              companyType: application.companyType,
              corporateEmail: application.corporateEmail,
              corporatePhone: application.corporatePhone,
              description: application.description,
              district: application.district,
              establishmentYear: application.establishmentYear,
              legalCompanyName: application.legalCompanyName,
              logoUrl: application.logoUrl,
              publicationCategories: application.publicationCategories,
              registryNumber: application.mersisOrRegistryNumber,
              slug: publisherSlug,
              taxNumber: application.taxNumber,
              taxOffice: application.taxOffice,
              verified: true,
              websiteUrl: application.websiteUrl,
            },
            select: { id: true },
          });
          publisherId = publisher.id;
        }

        const conflictingMembership = roleRequest.user.publisherMemberships.find(
          (membership) => membership.publisherId !== publisherId,
        );
        if (conflictingMembership) throw new Error("MEMBERSHIP_CONFLICT");

        await transaction.publisherMembership.upsert({
          where: { publisherId_userId: { publisherId, userId: roleRequest.userId } },
          create: {
            active: true,
            publisherId,
            role: "owner",
            userId: roleRequest.userId,
          },
          update: { active: true, role: "owner" },
        });

        const membership = await transaction.publisherMembership.findFirst({
          where: {
            active: true,
            publisherId,
            role: "owner",
            userId: roleRequest.userId,
          },
          select: { id: true },
        });

        if (!membership) {
          throw new Error("PUBLISHER_MEMBERSHIP_REQUIRED");
        }

        await transaction.publisherApplication.update({
          where: { id: application.id },
          data: {
            correctionNote: null,
            publisherId,
            verificationStatus: "approved",
          },
        });
      }

      await transaction.user.update({
        where: {
          id: roleRequest.userId,
        },
        data: {
          role: roleRequest.requestedRole,
        },
      });

      const claimedRequest = await transaction.roleRequest.updateMany({
        where: {
          id: roleRequest.id,
          status: "pending",
        },
        data: {
          pendingKey: null,
          reviewedAt: new Date(),
          reviewedById: admin.id,
          reviewNote,
          status: "approved",
        },
      });

      if (claimedRequest.count !== 1) {
        throw new Error("REQUEST_ALREADY_REVIEWED");
      }

      await transaction.roleRequest.updateMany({
        where: {
          id: { not: roleRequest.id },
          requestedRole: roleRequest.requestedRole,
          status: "pending",
          userId: roleRequest.userId,
        },
        data: { pendingKey: null, status: "cancelled" },
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

    await sendRoleRequestDecisionEmailSafely({
      decision: "approved",
      note: reviewNote,
      requestId,
    });

    revalidateRolePages();

    return {
      message: "Başvuru onaylandı ve kullanıcının rolü güvenle güncellendi.",
      status: "success",
    };
  } catch (error) {
    console.error("PUBLISHER_APPROVAL_FAILED", {
      code: actionErrorCode(error),
      requestId,
    });
    return errorState(error, "approve");
  }
}

export async function requestPublisherCorrectionAction(
  _previousState: RoleRequestActionState,
  formData: FormData,
): Promise<RoleRequestActionState> {
  let requestId = "";

  try {
    const admin = await requireAdmin();
    requestId = requestIdFrom(formData);
    const reviewNote = rejectionNoteFrom(formData);
    confirmationFrom(formData);

    await prisma.$transaction(async (transaction) => {
      const roleRequest = await transaction.roleRequest.findUnique({
        where: { id: requestId },
        include: { publisherApplication: { select: { id: true } } },
      });

      if (!roleRequest) throw new Error("ROLE_REQUEST_NOT_FOUND");
      if (roleRequest.status !== "pending") {
        throw new Error("ROLE_REQUEST_ALREADY_REVIEWED");
      }
      if (roleRequest.requestedRole !== "publisher") {
        throw new Error("INVALID_REQUEST_ROLE");
      }

      if (roleRequest.publisherApplication) {
        await transaction.publisherApplication.update({
          where: { id: roleRequest.publisherApplication.id },
          data: {
            correctionNote: reviewNote,
            verificationStatus: "changes_requested",
          },
        });
      }

      await transaction.roleRequest.update({
        where: { id: roleRequest.id },
        data: {
          reviewNote,
          reviewedAt: new Date(),
          reviewedById: admin.id,
        },
      });

      await transaction.notification.create({
        data: {
          message: reviewNote,
          relatedEntityId: roleRequest.id,
          relatedEntityType: "publisher_application",
          title: "Yayınevi başvurunuz için düzeltme gerekiyor",
          type: "system",
          userId: roleRequest.userId,
        },
      });

      await transaction.auditLog.create({
        data: {
          action: "role_request_reviewed",
          actorId: admin.id,
          entityId: roleRequest.id,
          entityType: "RoleRequest",
          metadata: JSON.stringify({
            decision: "changes_requested",
            requestedRole: "publisher",
            userId: roleRequest.userId,
          }),
        },
      });
    });

    await sendRoleRequestDecisionEmailSafely({
      decision: "changes_requested",
      note: reviewNote,
      requestId,
    });

    revalidateRolePages();

    return {
      message: "Düzeltme isteği kullanıcı hesabına ve bildirimlerine gönderildi.",
      status: "success",
    };
  } catch (error) {
    console.error("PUBLISHER_CORRECTION_REQUEST_FAILED", {
      code: actionErrorCode(error),
      requestId,
    });
    return errorState(error, "correction");
  }
}

export async function rejectRoleRequestAction(
  _previousState: RoleRequestActionState,
  formData: FormData,
): Promise<RoleRequestActionState> {
  let requestId = "";

  try {
    const admin = await requireAdmin();
    requestId = requestIdFrom(formData);
    const reviewNote = rejectionNoteFrom(formData);

    confirmationFrom(formData);

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
      throw new Error("ROLE_REQUEST_NOT_PENDING");
    }

    await prisma.$transaction(async (transaction) => {
      const updatedRequest = await transaction.roleRequest.updateMany({
        where: { id: roleRequest.id, status: "pending" },
        data: { pendingKey: null, reviewedAt: new Date(), reviewedById: admin.id, reviewNote, status: "rejected" },
      });
      if (updatedRequest.count !== 1) throw new Error("ROLE_REQUEST_ALREADY_REVIEWED");
      if (roleRequest.requestedRole === "publisher") {
        await transaction.publisherApplication.updateMany({
          where: { roleRequestId: roleRequest.id },
          data: {
            correctionNote: reviewNote,
            verificationStatus: "rejected",
          },
        });
      }
      if (roleRequest.requestedRole === "editor") {
        await transaction.user.updateMany({
          where: { id: roleRequest.userId, role: "editor_pending" },
          data: { role: "reader" },
        });
      }
      await transaction.auditLog.create({
        data: {
          action: "role_request_reviewed",
          actorId: admin.id,
          entityId: roleRequest.id,
          entityType: "RoleRequest",
          metadata: JSON.stringify({ decision: "rejected", requestedRole: roleRequest.requestedRole, userId: roleRequest.userId }),
        },
      });
    });

    await sendRoleRequestDecisionEmailSafely({
      decision: "rejected",
      note: reviewNote,
      requestId,
    });

    revalidateRolePages();

    return {
      message: "Başvuru reddedildi ve yönetici notu kullanıcı hesabına yansıtıldı.",
      status: "success",
    };
  } catch (error) {
    console.error("ROLE_REQUEST_REJECTION_FAILED", {
      code: actionErrorCode(error),
      requestId,
    });
    return errorState(error, "reject");
  }
}
