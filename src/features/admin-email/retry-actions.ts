"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getEmailSiteUrl,
  type EmailChannel,
} from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send-email";
import { prisma } from "@/lib/prisma";
import {
  canSafelyRetryEmailTemplate,
  emailRetryBlockedReason,
} from "./retry-policy";

export type AdminEmailRetryState = {
  message: string;
  status: "idle" | "success" | "error";
};

const allowedChannels = new Set<EmailChannel>([
  "default",
  "system",
  "support",
  "editor",
  "publisher",
]);

const RETRY_RATE_LIMIT_MS = 5 * 60 * 1000;
const STALE_PENDING_MS = 10 * 60 * 1000;

type RetryRow = {
  id: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function retryEmailDeliveryAction(
  _previousState: AdminEmailRetryState,
  formData: FormData,
): Promise<AdminEmailRetryState> {
  const admin = await getCurrentUser();

  if (!admin || admin.role !== "admin") {
    return {
      message: "Bu işlem için admin yetkisi gerekiyor.",
      status: "error",
    };
  }

  const deliveryId = String(
    formData.get("deliveryId") ?? "",
  ).trim();

  if (!deliveryId || deliveryId.length > 64) {
    return {
      message: "Geçerli bir e-posta kaydı seçilmedi.",
      status: "error",
    };
  }

  const source = await prisma.emailDelivery.findUnique({
    where: {
      id: deliveryId,
    },
  });

  if (!source) {
    return {
      message: "E-posta kaydı bulunamadı.",
      status: "error",
    };
  }

  const staleBefore = new Date(Date.now() - STALE_PENDING_MS);
  const retryableStatus = source.status === "failed"
    || (
      source.status === "pending"
      && source.attemptedAt <= staleBefore
    );

  if (!retryableStatus) {
    return {
      message: "Yalnızca başarısız veya 10 dakikayı aşmış bekleyen kayıtlar yeniden bildirilebilir.",
      status: "error",
    };
  }

  if (!canSafelyRetryEmailTemplate(source.template)) {
    return {
      message:
        emailRetryBlockedReason(source.template)
        || "Bu şablon güvenli tekrar gönderime uygun değil.",
      status: "error",
    };
  }

  if (!allowedChannels.has(source.channel as EmailChannel)) {
    return {
      message: "Kayıttaki gönderim kanalı desteklenmiyor.",
      status: "error",
    };
  }

  try {
    const recent = await prisma.$queryRaw<RetryRow[]>`
      SELECT id
      FROM EmailDeliveryRetry
      WHERE sourceDeliveryId = ${source.id}
        AND createdAt >= ${new Date(Date.now() - RETRY_RATE_LIMIT_MS)}
      ORDER BY createdAt DESC
      LIMIT 1
    `;

    if (recent[0]) {
      return {
        message: "Bu kayıt için son 5 dakika içinde zaten tekrar denemesi yapıldı.",
        status: "error",
      };
    }

    const retryId = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO EmailDeliveryRetry (
        id,
        sourceDeliveryId,
        actorId,
        status,
        createdAt,
        updatedAt
      ) VALUES (
        ${retryId},
        ${source.id},
        ${admin.id},
        'pending',
        CURRENT_TIMESTAMP(3),
        CURRENT_TIMESTAMP(3)
      )
    `;

    try {
      const notificationsUrl = new URL(
        "/bildirimler",
        getEmailSiteUrl(),
      ).toString();
      const retrySubject = `Tekrar bildirim: ${source.subject}`
        .slice(0, 500);
      const result = await sendEmail({
        channel: source.channel as EmailChannel,
        html: `
          <h1>İlkOku bildiriminizi yeniden iletiyoruz</h1>
          <p>Daha önce gönderilmeye çalışılan aşağıdaki bildirimin teslimi tamamlanamadı:</p>
          <p><strong>${escapeHtml(source.subject)}</strong></p>
          <p>Güncel durumu güvenli şekilde hesabınızdaki bildirimler bölümünden kontrol edebilirsiniz.</p>
          <p><a href="${escapeHtml(notificationsUrl)}">Bildirimleri aç</a></p>
          <p style="font-size:12px;color:#6b6b6b">Güvenliğiniz için önceki e-postanın gövdesi, tokenı veya özel bağlantısı saklanmadı ve yeniden kullanılmadı.</p>
        `.trim(),
        idempotencyKey: `admin-email-retry:${retryId}`,
        subject: retrySubject,
        template: "email_delivery_recovery_notice",
        text: [
          "İlkOku bildiriminizi yeniden iletiyoruz",
          "",
          "Daha önce gönderilmeye çalışılan bildirimin teslimi tamamlanamadı:",
          source.subject,
          "",
          "Güncel durumu hesabınızdaki bildirimler bölümünden kontrol edin:",
          notificationsUrl,
          "",
          "Güvenliğiniz için önceki e-posta gövdesi veya özel bağlantısı yeniden kullanılmadı.",
        ].join("\n"),
        to: source.toAddress,
      });

      if (!result.deliveryId) {
        throw new Error("RETRY_DELIVERY_ID_MISSING");
      }

      await prisma.$executeRaw`
        UPDATE EmailDeliveryRetry
        SET retryDeliveryId = ${result.deliveryId},
          status = 'sent',
          updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${retryId}
      `;

      revalidatePath("/admin/eposta-operasyonlari");
      revalidatePath("/admin/epostalar");

      return {
        message: "Güvenli tekrar bildirimi gönderildi ve operasyon kaydına işlendi.",
        status: "success",
      };
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "UNKNOWN_EMAIL_RETRY_ERROR";

      await prisma.$executeRaw`
        UPDATE EmailDeliveryRetry
        SET status = 'failed',
          failureMessage = ${message.slice(0, 1000)},
          updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${retryId}
      `;

      throw error;
    }
  } catch (error) {
    console.error("ADMIN_EMAIL_RETRY_FAILED", {
      deliveryId: source.id,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    });

    revalidatePath("/admin/eposta-operasyonlari");

    return {
      message: "Tekrar bildirimi gönderilemedi. Operasyon kaydındaki hata ayrıntısını inceleyin.",
      status: "error",
    };
  }
}
