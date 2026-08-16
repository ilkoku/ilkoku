"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  createPublisherDiscoveryShare,
  markPublisherSharedItemRead,
  type PublisherShareChannel,
  type PublisherShareEntityKind,
} from "./sharing-repository";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const allowedReturnPaths = [
  "/yayinevi/kesfet/eserler",
  "/yayinevi/kesfet/yazarlar",
  "/yayinevi/favorilerim",
  "/yayinevi/begenilerim",
  "/yayinevi/takip-ettiklerim",
  "/yayinevi/paylasilanlar",
] as const;

export interface PublisherShareActionState {
  message: string;
  status: "error" | "idle" | "success";
}

function safeReturnPath(
  value: FormDataEntryValue | null,
  fallbackPath: string,
) {
  const raw = String(value ?? "").trim();

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return fallbackPath;
  }

  const url = new URL(raw, "http://ilkoku.local");

  if (!allowedReturnPaths.includes(
    url.pathname as (typeof allowedReturnPaths)[number],
  )) {
    return fallbackPath;
  }

  return `${url.pathname}${url.search}`;
}

function isEntityKind(value: string): value is PublisherShareEntityKind {
  return value === "author" || value === "work";
}

function isChannel(value: string): value is PublisherShareChannel {
  return value === "email" || value === "team";
}

export async function createPublisherDiscoveryShareAction(
  _previousState: PublisherShareActionState,
  formData: FormData,
): Promise<PublisherShareActionState> {
  const returnPath = safeReturnPath(
    formData.get("returnPath"),
    "/yayinevi/kesfet/eserler",
  );
  const entityId = String(formData.get("entityId") ?? "").trim();
  const entityKind = String(formData.get("entityKind") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const recipientEmail = String(
    formData.get("recipientEmail") ?? "",
  ).trim();
  const recipientMembershipIds = formData
    .getAll("recipientMembershipIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (
    !UUID_PATTERN.test(entityId) ||
    !isEntityKind(entityKind) ||
    !isChannel(channel)
  ) {
    return {
      message: "Paylaşılacak kayıt doğrulanamadı.",
      status: "error",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(returnPath)}`);
  }

  const result = await createPublisherDiscoveryShare({
    channel,
    entityId,
    entityKind,
    note,
    recipientEmail:
      channel === "email"
        ? recipientEmail
        : null,
    recipientMembershipIds,
    userId: user.id,
  });

  if (result.status === "forbidden") {
    return {
      message:
        channel === "team"
          ? "Ekip içinde paylaşım yetkiniz bulunmuyor."
          : "E-postayla paylaşım yetkiniz bulunmuyor.",
      status: "error",
    };
  }

  if (result.status === "membership_not_found") {
    return {
      message: "Aktif yayınevi üyeliği bulunamadı.",
      status: "error",
    };
  }

  if (result.status === "invalid_note") {
    return {
      message: "Paylaşım notu 3–1000 karakter arasında olmalıdır.",
      status: "error",
    };
  }

  if (result.status === "invalid_recipients") {
    return {
      message:
        "En az bir yetkili ekip üyesi seçin. Seçilen üyelerin paylaşımları görme yetkisi olmalıdır.",
      status: "error",
    };
  }

  if (result.status === "invalid_email") {
    return {
      message: "Geçerli bir alıcı e-posta adresi girin.",
      status: "error",
    };
  }

  if (result.status === "invalid_entity") {
    return {
      message: "Paylaşılacak public kayıt artık bulunamıyor.",
      status: "error",
    };
  }

  if (result.status === "rate_limited") {
    return {
      message:
        "Güvenlik sınırına ulaşıldı: dış e-posta paylaşımı 10 dakikada en fazla 12 kez yapılabilir. Pencere yenilendiğinde tekrar deneyin.",
      status: "error",
    };
  }

  if (result.status === "recipient_rate_limited") {
    return {
      message:
        "Aynı e-posta adresine son 5 dakika içinde zaten paylaşım yapıldı. Yeni gönderim için kısa süre sonra tekrar deneyin.",
      status: "error",
    };
  }

  revalidatePath(returnPath.split("?")[0]);
  revalidatePath("/yayinevi/paylasilanlar");
  revalidatePath("/yayinevi/bildirimler");

  if (result.status === "email_failed") {
    return {
      message:
        "Paylaşım kaydı oluşturuldu ancak e-posta teslimi başarısız görünüyor. Önce E-posta Operasyonları delivery kaydını kontrol edin; otomatik olarak yeni bir paylaşım oluşturmayın.",
      status: "error",
    };
  }

  return {
    message:
      channel === "team"
        ? "Kayıt seçilen ekip üyeleriyle paylaşıldı."
        : "Paylaşım e-postası gönderildi.",
    status: "success",
  };
}

export async function markPublisherSharedItemReadAction(
  formData: FormData,
): Promise<void> {
  const shareId = String(formData.get("shareId") ?? "").trim();

  if (!UUID_PATTERN.test(shareId)) {
    redirect("/yayinevi/paylasilanlar");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/giris?sonraki=/yayinevi/paylasilanlar");
  }

  await markPublisherSharedItemRead({
    shareId,
    userId: user.id,
  });

  revalidatePath("/yayinevi/paylasilanlar");
  revalidatePath("/yayinevi/bildirimler");
  redirect("/yayinevi/paylasilanlar");
}