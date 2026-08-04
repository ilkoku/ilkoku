"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  sendPublisherInvitationAcceptedEmail,
} from "@/lib/email/publisher-engagement-emails";
import { prisma } from "@/lib/prisma";
import {
  acceptPublisherInvitation,
} from "./repository";
import type {
  PublisherActionState,
} from "./types";

export async function acceptPublisherInvitationAction(
  _state: PublisherActionState,
  formData: FormData,
): Promise<PublisherActionState> {
  const user = await getCurrentUser();

  if (!user || user.role === "admin") {
    return {
      message:
        "Daveti kabul etmek için giriş yapmalısınız.",
      status: "error",
    };
  }

  const token = String(
    formData.get("token") ?? "",
  ).trim();

  if (!token) {
    return {
      message: "Davet bağlantısı geçersiz.",
      status: "error",
    };
  }

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const invitation =
    await prisma.publisherInvitation.findFirst({
      where: {
        expiresAt: {
          gt: new Date(),
        },
        status: "pending",
        tokenHash,
      },
      select: {
        invitedBy: {
          select: {
            email: true,
            emailVerified: true,
            fullName: true,
            id: true,
          },
        },
        publisher: {
          select: {
            companyName: true,
          },
        },
      },
    });

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
        message:
          "Hesabınız bu daveti kabul etmeye uygun değil.",
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

    if (invitation) {
      try {
        await prisma.notification.create({
          data: {
            message:
              `${user.fullName}, ${invitation.publisher.companyName} ekip davetini kabul etti.`,
            relatedEntityId:
              result.publisherId,
            relatedEntityType:
              "publisher",
            title:
              "Yayınevi ekip daveti kabul edildi",
            type: "system",
            userId:
              invitation.invitedBy.id,
          },
        });

        if (
          invitation.invitedBy
            .emailVerified
        ) {
          await sendPublisherInvitationAcceptedEmail({
            acceptedMemberName:
              user.fullName,
            email:
              invitation.invitedBy.email,
            inviterName:
              invitation.invitedBy.fullName,
            publisherName:
              invitation.publisher.companyName,
          });
        }
      } catch (notificationError) {
        console.error(
          "PUBLISHER_INVITATION_ACCEPT_NOTIFICATION_FAILED",
          {
            error:
              notificationError instanceof Error
                ? notificationError.message
                : "UNKNOWN_ERROR",
            publisherId:
              result.publisherId,
            userId: user.id,
          },
        );
      }
    }

    revalidatePath("/yayinevi");
    revalidatePath("/yayinevi/uyeler");
  } catch (error) {
    console.error(
      "PUBLISHER_INVITATION_ACCEPT_FAILED",
      {
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
        userId: user.id,
      },
    );

    return {
      message:
        "Davet kabul edilirken bir hata oluştu.",
      status: "error",
    };
  }

  redirect("/yayinevi");
}
