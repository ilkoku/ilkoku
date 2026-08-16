"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  saveSecurePublicationPlanAction,
  saveSecurePublisherContractAction,
} from "@/features/publisher-contracts/actions";
import {
  addSecurePublisherInternalNoteAction,
  updateSecurePublisherDecisionAction,
} from "@/features/publisher-submissions/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { sendPublisherTeamInvitationEmail } from "@/lib/email/publisher-emails";
import { prisma } from "@/lib/prisma";
import { acceptPublisherInvitationLocked } from "./invitation-acceptance-state";
import {
  cancelPublisherInvitationLocked,
  createPublisherInvitationLocked,
  updatePublisherMemberLocked,
  type EditablePublisherMemberRole,
} from "./member-control-state";
import {
  customizablePublisherPermissionKeys,
  publisherPermissionLabels,
  publisherRoleLabels,
  type PublisherPermission,
} from "./permissions";
import type {
  PublisherContractActionState,
  PublisherDecisionActionState,
  PublisherInternalNoteActionState,
} from "./types";

async function getPublisherWriteUser() {
  const user = await getCurrentUser();
  return !user || user.role === "admin" ? null : user;
}

export async function updatePublisherDecisionAction(
  state: PublisherDecisionActionState,
  formData: FormData,
): Promise<PublisherDecisionActionState> {
  return updateSecurePublisherDecisionAction(state, formData);
}

export async function addPublisherInternalNoteAction(
  state: PublisherInternalNoteActionState,
  formData: FormData,
): Promise<PublisherInternalNoteActionState> {
  return addSecurePublisherInternalNoteAction(state, formData);
}

export async function savePublisherContractAction(
  state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  return saveSecurePublisherContractAction(state, formData);
}

export async function savePublicationPlanAction(
  state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  return saveSecurePublicationPlanAction(state, formData);
}

export async function markPublisherNotificationReadAction(formData: FormData): Promise<void> {
  const user = await getPublisherWriteUser();
  if (!user) throw new Error("PUBLISHER_PERMISSION_REQUIRED");
  const notificationId = String(formData.get("notificationId") ?? "").trim();
  if (!notificationId) throw new Error("NOTIFICATION_REQUIRED");
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/yayinevi/bildirimler");
}

export async function markAllPublisherNotificationsReadAction(): Promise<void> {
  const user = await getPublisherWriteUser();
  if (!user) throw new Error("PUBLISHER_PERMISSION_REQUIRED");
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/yayinevi/bildirimler");
}

const editableMemberRoles = new Set<EditablePublisherMemberRole>([
  "manager",
  "submissions_manager",
  "editorial",
  "contract_manager",
  "reviewer",
  "viewer",
]);

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
    raw.some((permission) =>
      !editablePublisherPermissions.has(permission as PublisherPermission),
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
  const role = String(formData.get("role") ?? "").trim() as EditablePublisherMemberRole;
  const permissions = readPublisherPermissions(formData);
  const active = formData.get("active") === "true";

  if (!memberId || !editableMemberRoles.has(role) || !permissions) {
    return { message: "Üye, rol veya yetki bilgisi geçersiz.", status: "error" };
  }

  const updated = await updatePublisherMemberLocked({
    active,
    memberId,
    permissions,
    role,
    userId: user.id,
  });

  if (!updated) {
    return { message: "Bu üyeyi değiştirme yetkiniz yok.", status: "error" };
  }

  revalidatePath("/yayinevi/uyeler");
  return { message: "Üye yetkisi güncellendi.", status: "success" };
}

export async function invitePublisherMemberAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await getPublisherWriteUser();
  if (!user) return { message: "Bu işlem için giriş yapmalısınız.", status: "error" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "").trim() as EditablePublisherMemberRole;
  const permissions = readPublisherPermissions(formData);
  const emailIsValid = email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailIsValid) {
    return { message: "Geçerli bir e-posta adresi girin.", status: "error" };
  }
  if (!editableMemberRoles.has(role)) {
    return { message: "Davet için geçerli bir ekip rolü seçin.", status: "error" };
  }
  if (!permissions) {
    return { message: "Davet için en az bir geçerli çalışma yetkisi seçin.", status: "error" };
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  try {
    const result = await createPublisherInvitationLocked({
      email,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      permissions,
      role,
      tokenHash,
      userId: user.id,
    });

    if (result.status === "forbidden") {
      return { message: "Ekip üyesi davet etme yetkiniz yok.", status: "error" };
    }
    if (result.status === "already_member") {
      return { message: "Bu e-posta adresi zaten yayınevi ekibinde.", status: "error" };
    }
    if (result.status === "already_pending") {
      return { message: "Bu e-posta adresi için bekleyen bir davet zaten var.", status: "error" };
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
        role: publisherRoleLabels[role],
      });
    } catch (error) {
      emailSent = false;
      console.error("PUBLISHER_INVITATION_EMAIL_FAILED", {
        email,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
        invitationId: result.invitation.id,
        userId: user.id,
      });
    }

    revalidatePath("/yayinevi/uyeler");
    return {
      message: emailSent
        ? "Davet oluşturuldu ve e-posta adresine gönderildi."
        : "Davet oluşturuldu; e-posta gönderilemedi.",
      status: "success",
    };
  } catch (error) {
    console.error("PUBLISHER_INVITATION_CREATE_FAILED", {
      email,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      userId: user.id,
    });
    return { message: "Ekip daveti oluşturulamadı. Yeniden deneyin.", status: "error" };
  }
}

export async function cancelPublisherInvitationAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await getPublisherWriteUser();
  if (!user) return { message: "Bu işlem için giriş yapmalısınız.", status: "error" };

  const invitationId = String(formData.get("invitationId") ?? "").trim();
  if (!invitationId) {
    return { message: "İptal edilecek davet bulunamadı.", status: "error" };
  }

  try {
    const cancelled = await cancelPublisherInvitationLocked({
      invitationId,
      userId: user.id,
    });

    if (!cancelled) {
      return {
        message: "Davet iptal edilemedi veya artık bekleyen durumda değil.",
        status: "error",
      };
    }

    revalidatePath("/yayinevi/uyeler");
    return { message: "Ekip daveti iptal edildi.", status: "success" };
  } catch (error) {
    console.error("PUBLISHER_INVITATION_CANCEL_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      invitationId,
      userId: user.id,
    });
    return { message: "Davet iptal edilirken bir hata oluştu.", status: "error" };
  }
}

export async function acceptPublisherInvitationAction(
  _state: PublisherContractActionState,
  formData: FormData,
): Promise<PublisherContractActionState> {
  const user = await getPublisherWriteUser();
  if (!user) return { message: "Daveti kabul etmek için giriş yapmalısınız.", status: "error" };

  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { message: "Davet bağlantısı geçersiz.", status: "error" };

  try {
    const result = await acceptPublisherInvitationLocked({ token, userId: user.id });

    if (result.status === "email_mismatch") {
      return {
        message: `Bu davet ${result.invitedEmail} adresine gönderilmiş. Lütfen o e-posta adresine ait hesapla giriş yapın.`,
        status: "error",
      };
    }
    if (result.status === "invalid_user") {
      return { message: "Hesabınız bu daveti kabul etmeye uygun değil.", status: "error" };
    }
    if (result.status !== "accepted") {
      return {
        message: "Davet geçersiz, süresi dolmuş veya daha önce kullanılmış.",
        status: "error",
      };
    }

    revalidatePath("/yayinevi");
    revalidatePath("/yayinevi/uyeler");
  } catch (error) {
    console.error("PUBLISHER_INVITATION_ACCEPT_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      userId: user.id,
    });
    return { message: "Davet kabul edilirken bir hata oluştu.", status: "error" };
  }

  redirect("/yayinevi");
}
