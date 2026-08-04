"use server";

import {
  revalidatePath,
} from "next/cache";
import {
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  getEmailDeliveryMode,
  type EmailChannel,
} from "@/lib/email/config";
import {
  sendEmail,
} from "@/lib/email/send-email";
import {
  prisma,
} from "@/lib/prisma";

export interface AdminEmailActionState {
  deliveryId?: string;
  message: string;
  status:
    | "idle"
    | "success"
    | "error";
}

const allowedChannels =
  new Set<EmailChannel>([
    "default",
    "system",
    "support",
    "editor",
    "publisher",
  ]);

function validEmail(
  value: string,
) {
  return (
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value,
    )
  );
}

export async function sendAdminTestEmailAction(
  _previousState: AdminEmailActionState,
  formData: FormData,
): Promise<AdminEmailActionState> {
  const admin =
    await getCurrentUser();

  if (
    !admin ||
    admin.role !== "admin"
  ) {
    return {
      message:
        "Bu işlem için admin yetkisi gerekiyor.",
      status: "error",
    };
  }

  const recipient =
    String(
      formData.get("recipient") ?? "",
    )
      .trim()
      .toLowerCase();

  const channel =
    String(
      formData.get("channel") ?? "",
    ) as EmailChannel;

  const confirmation =
    String(
      formData.get("confirmation") ?? "",
    );

  if (!validEmail(recipient)) {
    return {
      message:
        "Geçerli bir alıcı e-posta adresi girin.",
      status: "error",
    };
  }

  if (!allowedChannels.has(channel)) {
    return {
      message:
        "Geçerli bir gönderim kanalı seçin.",
      status: "error",
    };
  }

  if (
    confirmation !==
    "SEND_ADMIN_TEST_EMAIL"
  ) {
    return {
      message:
        "Test gönderimini onaylamanız gerekiyor.",
      status: "error",
    };
  }

  const deliveryMode =
    getEmailDeliveryMode();

  if (
    deliveryMode === "smtp" &&
    recipient !==
      admin.email
        .trim()
        .toLowerCase()
  ) {
    return {
      message:
        "SMTP testleri yalnızca giriş yapan adminin kendi adresine gönderilebilir.",
      status: "error",
    };
  }

  try {
    const result =
      await sendEmail({
        channel,
        html: `
          <h1>İlkOku e-posta sistem testi</h1>
          <p>Merhaba ${admin.displayName || admin.fullName},</p>
          <p>Bu mesaj, admin E-posta Kontrol Merkezi üzerinden oluşturulmuş güvenli bir testtir.</p>
          <p>Gönderim modu: <strong>${deliveryMode}</strong></p>
        `.trim(),
        subject:
          "İlkOku e-posta sistem testi",
        template:
          "admin_test_email",
        text: [
          `Merhaba ${admin.displayName || admin.fullName},`,
          "",
          "Bu mesaj, admin E-posta Kontrol Merkezi üzerinden oluşturulmuş güvenli bir testtir.",
          `Gönderim modu: ${deliveryMode}`,
        ].join("\n"),
        to:
          recipient,
      });

    await prisma.auditLog.create({
      data: {
        action:
          "email_test_sent",
        actorId:
          admin.id,
        entityId:
          result.deliveryId,
        entityType:
          "EmailDelivery",
        metadata:
          JSON.stringify({
            channel,
            deliveryId:
              result.deliveryId,
            deliveryMode,
            recipient,
            source:
              "admin_email_center",
            status:
              "sent",
            template:
              "admin_test_email",
          }),
      },
    });

    revalidatePath(
      "/admin/epostalar",
    );

    revalidatePath(
      "/admin/audit-log",
    );

    return {
      deliveryId:
        result.deliveryId,
      message:
        deliveryMode === "local"
          ? "Test mesajı local outbox'a yazıldı ve kaydedildi."
          : "Test e-postası admin adresinize gönderildi ve kaydedildi.",
      status:
        "success",
    };
  } catch (error) {
    console.error(
      "ADMIN_EMAIL_TEST_FAILED",
      {
        channel,
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
        recipient,
      },
    );

    revalidatePath(
      "/admin/epostalar",
    );

    return {
      message:
        "Test mesajı gönderilemedi. Hata kaydını aşağıdaki listeden inceleyin.",
      status:
        "error",
    };
  }
}
