"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  sendPublisherContractEmail,
  sendPublisherSubmissionDecisionEmail,
  sendPublisherTeamInvitationEmail,
} from "@/lib/email/publisher-emails";
import {
  addPublisherInternalNote,
  acceptPublisherInvitation,
  cancelPublisherInvitation,
  createPublisherInvitation,
  updatePublisherMember,
  updatePublisherSubmissionDecision,
  upsertPublicationPlan,
  upsertPublisherContract,
} from "./repository";
import {
  customizablePublisherPermissionKeys,
  publisherPermissionLabels,
  publisherRoleLabels,
  type PublisherPermission,
} from "./permissions";
import type {
  PublisherDecisionActionState,
  PublisherInternalNoteActionState,
  PublisherContractActionState,
  PublisherWorkspaceSubmissionStatus,
} from "./types";

async function getPublisherWriteUser() {
  const user = await getCurrentUser();

  if (!user || user.role === "admin") {
    return null;
  }

  return user;
}

const allowedStatuses = new Set<PublisherWorkspaceSubmissionStatus>([
  "pending",
  "reviewing",
  "accepted",
  "rejected",
]);

export async function updatePublisherDecisionAction(
  _state: PublisherDecisionActionState,
  formData: FormData,
): Promise<PublisherDecisionActionState> {
  const user = await getPublisherWriteUser();
  if (!user) {
    return { message: "Bu işlem için giriş yapmalısınız.", status: "error" };
  }

  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as PublisherWorkspaceSubmissionStatus;
  const noteValue = String(formData.get("publisherNote") ?? "").trim();

  if (!submissionId || !allowedStatuses.has(status)) {
    return { message: "Başvuru veya karar bilgisi geçersiz.", status: "error" };
  }

  if ((status === "accepted" || status === "rejected") && noteValue.length < 10) {
    return { message: "Kabul veya red kararında en az 10 karakterlik karar notu yazın.", status: "error" };
  }

  const updated = await updatePublisherSubmissionDecision({
    note: noteValue || null,
    status: status as Exclude<PublisherWorkspaceSubmissionStatus, "withdrawn">,
    submissionId,
    userId: user.id,
  });

  if (!updated) {
    return { message: "Başvuru bulunamadı veya bu yayınevine ait değil.", status: "error" };
  }

  let emailSent = true;

  if (
    updated.statusChanged &&
    (
      status === "reviewing" ||
      status === "accepted" ||
      status === "rejected"
    )
  ) {
    try {
      await sendPublisherSubmissionDecisionEmail({
        email: updated.author.email,
        fullName: updated.author.fullName,
        note: noteValue || null,
        status,
        submissionId,
        workTitle: updated.work.title,
      });
    } catch (error) {
      emailSent = false;

      console.error(
        "PUBLISHER_SUBMISSION_EMAIL_FAILED",
        {
          error:
            error instanceof Error
              ? error.message
              : "UNKNOWN_ERROR",
          status,
          submissionId,
        },
      );
    }
  }

  revalidatePath("/yayinevi");
  revalidatePath(`/yayinevi/basvurular/${submissionId}`);

  return {
    message:
      emailSent
        ? "Başvuru kararı güncellendi ve geçmişe kaydedildi."
        : "Başvuru kararı güncellendi; e-posta gönderilemedi.",
    status: "success",
  };
}

export async function addPublisherInternalNoteAction(
  _state: PublisherInternalNoteActionState,
  formData: FormData,
): Promise<PublisherInternalNoteActionState> {
  const user = await getPublisherWriteUser();
  if (!user) {
    return { message: "Bu işlem için giriş yapmalısınız.", status: "error" };
  }

  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const note = String(formData.get("internalNote") ?? "").trim();

  if (!submissionId) return { message: "Başvuru bilgisi eksik.", status: "error" };
  if (note.length < 3) return { message: "İç not en az 3 karakter olmalı.", status: "error" };
  if (note.length > 3000) return { message: "İç not 3000 karakteri geçemez.", status: "error" };

  const created = await addPublisherInternalNote({ note, submissionId, userId: user.id });
  if (!created) {
    return { message: "Başvuru bulunamadı veya bu yayınevine ait değil.", status: "error" };
  }

  revalidatePath(`/yayinevi/basvurular/${submissionId}`);
  return { message: "İç not geçmişe eklendi.", status: "success" };
}


export async function savePublisherContractAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await getPublisherWriteUser();
  if (!user) return { message: "Bu işlem için giriş yapmalısınız.", status: "error" };

  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const territory = String(formData.get("territory") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const royaltyPercentage = Number(formData.get("royaltyPercentage"));
  const advanceRaw = String(formData.get("advanceAmount") ?? "").trim();
  const advanceAmount = advanceRaw ? Number(advanceRaw) : null;
  const rightsPeriodMonths = Number(formData.get("rightsPeriodMonths"));
  const intent = String(formData.get("intent") ?? "draft");

  if (!submissionId || !territory) return { message: "Sözleşme bilgileri eksik.", status: "error" };
  if (!Number.isFinite(royaltyPercentage) || royaltyPercentage < 0 || royaltyPercentage > 100) return { message: "Telif oranı 0 ile 100 arasında olmalı.", status: "error" };
  if (!Number.isInteger(rightsPeriodMonths) || rightsPeriodMonths < 1 || rightsPeriodMonths > 240) return { message: "Hak süresi 1–240 ay arasında olmalı.", status: "error" };
  if (advanceAmount !== null && (!Number.isFinite(advanceAmount) || advanceAmount < 0)) return { message: "Avans tutarı geçersiz.", status: "error" };

  const saved = await upsertPublisherContract({
    advanceAmount,
    notes,
    rightsPeriodMonths,
    royaltyPercentage,
    status: intent === "send" ? "sent" : "draft",
    submissionId,
    territory,
    userId: user.id,
  });
  if (!saved) return { message: "Yalnızca kabul edilmiş ve yayınevinize ait başvurularda sözleşme oluşturabilirsiniz.", status: "error" };

  let emailSent = true;

  if (intent === "send") {
    try {
      await sendPublisherContractEmail({
        email: saved.author.email,
        fullName: saved.author.fullName,
        submissionId,
        workTitle: saved.work.title,
      });
    } catch (error) {
      emailSent = false;

      console.error(
        "PUBLISHER_CONTRACT_EMAIL_FAILED",
        {
          error:
            error instanceof Error
              ? error.message
              : "UNKNOWN_ERROR",
          submissionId,
        },
      );
    }
  }

  revalidatePath(`/yayinevi/basvurular/${submissionId}`);
  return {
    message:
      intent === "send"
        ? (
            emailSent
              ? "Sözleşme yazara gönderildi."
              : "Sözleşme kaydedildi; e-posta gönderilemedi."
          )
        : "Sözleşme taslağı kaydedildi.",
    status: "success",
  };
}

export async function savePublicationPlanAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await getPublisherWriteUser();
  if (!user) return { message: "Bu işlem için giriş yapmalısınız.", status: "error" };

  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const targetRaw = String(formData.get("targetPublicationDate") ?? "").trim();
  const printRunRaw = String(formData.get("printRun") ?? "").trim();
  const printRun = printRunRaw ? Number(printRunRaw) : null;
  const allowedPlanStatuses = new Set(["planning", "preproduction", "production", "distribution", "published"]);
  const allowedTaskStatuses = new Set(["not_started", "in_progress", "completed"]);
  const status = String(formData.get("planStatus") ?? "planning");
  const coverStatus = String(formData.get("coverStatus") ?? "not_started");
  const layoutStatus = String(formData.get("layoutStatus") ?? "not_started");

  if (!submissionId || !allowedPlanStatuses.has(status) || !allowedTaskStatuses.has(coverStatus) || !allowedTaskStatuses.has(layoutStatus)) return { message: "Yayın planı bilgileri geçersiz.", status: "error" };
  if (printRun !== null && (!Number.isInteger(printRun) || printRun < 1)) return { message: "Baskı adedi pozitif tam sayı olmalı.", status: "error" };
  const targetPublicationDate = targetRaw ? new Date(`${targetRaw}T12:00:00`) : null;
  if (targetPublicationDate && Number.isNaN(targetPublicationDate.getTime())) return { message: "Yayın tarihi geçersiz.", status: "error" };

  const saved = await upsertPublicationPlan({
    coverStatus: coverStatus as "not_started" | "in_progress" | "completed",
    isbn: String(formData.get("isbn") ?? "").trim() || null,
    layoutStatus: layoutStatus as "not_started" | "in_progress" | "completed",
    notes: String(formData.get("planNotes") ?? "").trim() || null,
    printRun,
    status: status as "planning" | "preproduction" | "production" | "distribution" | "published",
    submissionId,
    targetPublicationDate,
    userId: user.id,
  });
  if (!saved) return { message: "Yayın planı yalnızca kabul edilmiş ve yayınevinize ait başvurularda oluşturulabilir.", status: "error" };

  revalidatePath(`/yayinevi/basvurular/${submissionId}`);
  return { message: "Yayın planı kaydedildi.", status: "success" };
}

export async function markPublisherNotificationReadAction(formData: FormData): Promise<void> {
  const user = await getPublisherWriteUser();
  if (!user) throw new Error("PUBLISHER_PERMISSION_REQUIRED");
  const notificationId = String(formData.get("notificationId") ?? "").trim();
  if (!notificationId) throw new Error("NOTIFICATION_REQUIRED");
  await prisma.notification.updateMany({ where: { id: notificationId, userId: user.id }, data: { readAt: new Date() } });
  revalidatePath("/yayinevi/bildirimler");
}

export async function markAllPublisherNotificationsReadAction(): Promise<void> {
  const user = await getPublisherWriteUser();
  if (!user) throw new Error("PUBLISHER_PERMISSION_REQUIRED");
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/yayinevi/bildirimler");
}

const editableMemberRoles = new Set(["manager", "submissions_manager", "editorial", "contract_manager", "reviewer", "viewer"]);

const editablePublisherPermissions = new Set<PublisherPermission>(
  customizablePublisherPermissionKeys,
);

function readPublisherPermissions(formData: FormData): PublisherPermission[] | null {
  const raw = formData
    .getAll("permissions")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (
    raw.length === 0 ||
    raw.some(
      (permission) =>
        !editablePublisherPermissions.has(
          permission as PublisherPermission,
        ),
    )
  ) {
    return null;
  }

  return Array.from(new Set(raw)) as PublisherPermission[];
}

export async function updatePublisherMemberAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await getPublisherWriteUser();
  if (!user) return { message: "Bu işlem için giriş yapmalısınız.", status: "error" };
  const memberId = String(formData.get("memberId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const permissions = readPublisherPermissions(formData);
  const active = formData.get("active") === "true";
  if (!memberId || !editableMemberRoles.has(role) || !permissions) return { message: "Üye, rol veya yetki bilgisi geçersiz.", status: "error" };
  const updated = await updatePublisherMember({
    active,
    memberId,
    permissions,
    role: role as "manager" | "submissions_manager" | "editorial" | "contract_manager" | "reviewer" | "viewer",
    userId: user.id,
  });
  if (!updated) return { message: "Bu üyeyi değiştirme yetkiniz yok.", status: "error" };
  revalidatePath("/yayinevi/uyeler");
  return { message: "Üye yetkisi güncellendi.", status: "success" };
}

export async function invitePublisherMemberAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await getPublisherWriteUser();

  if (!user) {
    return {
      message: "Bu işlem için giriş yapmalısınız.",
      status: "error",
    };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const role = String(formData.get("role") ?? "").trim();
  const permissions = readPublisherPermissions(formData);

  const emailIsValid =
    email.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailIsValid) {
    return {
      message: "Geçerli bir e-posta adresi girin.",
      status: "error",
    };
  }

  if (!editableMemberRoles.has(role)) {
    return {
      message: "Davet için geçerli bir ekip rolü seçin.",
      status: "error",
    };
  }

  if (!permissions) {
    return {
      message: "Davet için en az bir geçerli çalışma yetkisi seçin.",
      status: "error",
    };
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256")
    .update(rawToken)
    .digest("hex");

  try {
    const result = await createPublisherInvitation({
      email,
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ),
      permissions,
      role: role as
        | "manager"
        | "submissions_manager"
        | "editorial"
        | "contract_manager"
        | "reviewer"
        | "viewer",
      tokenHash,
      userId: user.id,
    });

    if (result.status === "forbidden") {
      return {
        message: "Ekip üyesi davet etme yetkiniz yok.",
        status: "error",
      };
    }

    if (result.status === "already_member") {
      return {
        message: "Bu e-posta adresi zaten yayınevi ekibinde.",
        status: "error",
      };
    }

    if (result.status === "already_pending") {
      return {
        message: "Bu e-posta adresi için bekleyen bir davet zaten var.",
        status: "error",
      };
    }

    let emailSent = true;

    try {
      await sendPublisherTeamInvitationEmail({
        email,
        inviterName: user.fullName,
        permissions: permissions.map(
          (permission) => publisherPermissionLabels[permission],
        ),
        publisherName: result.publisherName,
        rawToken,
        role: publisherRoleLabels[
          role as keyof typeof publisherRoleLabels
        ],
      });
    } catch (error) {
      emailSent = false;

      console.error(
        "PUBLISHER_INVITATION_EMAIL_FAILED",
        {
          email,
          error:
            error instanceof Error
              ? error.message
              : "UNKNOWN_ERROR",
          invitationId: result.invitation.id,
          userId: user.id,
        },
      );
    }

    revalidatePath("/yayinevi/uyeler");

    return {
      message:
        emailSent
          ? "Davet oluşturuldu ve e-posta adresine gönderildi."
          : "Davet oluşturuldu; e-posta gönderilemedi.",
      status: "success",
    };
  } catch (error) {
    console.error("PUBLISHER_INVITATION_CREATE_FAILED", {
      email,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
      userId: user.id,
    });

    return {
      message: "Ekip daveti oluşturulamadı. Yeniden deneyin.",
      status: "error",
    };
  }
}

export async function cancelPublisherInvitationAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await getPublisherWriteUser();

  if (!user) {
    return {
      message: "Bu işlem için giriş yapmalısınız.",
      status: "error",
    };
  }

  const invitationId = String(
    formData.get("invitationId") ?? "",
  ).trim();

  if (!invitationId) {
    return {
      message: "İptal edilecek davet bulunamadı.",
      status: "error",
    };
  }

  try {
    const cancelled = await cancelPublisherInvitation({
      invitationId,
      userId: user.id,
    });

    if (!cancelled) {
      return {
        message:
          "Davet iptal edilemedi veya artık bekleyen durumda değil.",
        status: "error",
      };
    }

    revalidatePath("/yayinevi/uyeler");

    return {
      message: "Ekip daveti iptal edildi.",
      status: "success",
    };
  } catch (error) {
    console.error("PUBLISHER_INVITATION_CANCEL_FAILED", {
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
      invitationId,
      userId: user.id,
    });

    return {
      message: "Davet iptal edilirken bir hata oluştu.",
      status: "error",
    };
  }
}

export async function acceptPublisherInvitationAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await getPublisherWriteUser();

  if (!user) {
    return {
      message: "Daveti kabul etmek için giriş yapmalısınız.",
      status: "error",
    };
  }

  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    return {
      message: "Davet bağlantısı geçersiz.",
      status: "error",
    };
  }

  try {
    const result = await acceptPublisherInvitation({
      token,
      userId: user.id,
    });

    if (result.status === "email_mismatch") {
      return {
        message:
          `Bu davet ${result.invitedEmail} adresine gönderilmiş. ` +
          "Lütfen o e-posta adresine ait hesapla giriş yapın.",
        status: "error",
      };
    }

    if (result.status === "invalid_user") {
      return {
        message: "Hesabınız bu daveti kabul etmeye uygun değil.",
        status: "error",
      };
    }

    if (result.status !== "accepted") {
      return {
        message:
          "Davet geçersiz, süresi dolmuş veya daha önce kullanılmış.",
        status: "error",
      };
    }

    revalidatePath("/yayinevi");
    revalidatePath("/yayinevi/uyeler");
  } catch (error) {
    console.error("PUBLISHER_INVITATION_ACCEPT_FAILED", {
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
      userId: user.id,
    });

    return {
      message: "Davet kabul edilirken bir hata oluştu.",
      status: "error",
    };
  }

  redirect("/yayinevi");
}
