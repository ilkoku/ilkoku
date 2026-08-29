"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getAdultContentAccess,
  isPlausibleBirthDate,
  parseBirthDate,
  safeAdultGateReturnPath,
  saveAdultContentConsent,
  saveVerifiedBirthDate,
} from "@/lib/adult-content-access";

export type AdultGateActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

export const initialAdultGateActionState: AdultGateActionState = {
  message: "",
  status: "idle",
};

function failure(message: string): AdultGateActionState {
  return { message, status: "error" };
}

export async function saveBirthDateAction(
  _state: AdultGateActionState,
  formData: FormData,
): Promise<AdultGateActionState> {
  const user = await getCurrentUser();
  const returnTo = safeAdultGateReturnPath(
    String(formData.get("returnTo") ?? ""),
  );

  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(`/yas-dogrulama?sonraki=${encodeURIComponent(returnTo)}`)}`);
  }

  if (user.role === "admin") redirect(returnTo);

  const current = await getAdultContentAccess(user.id);
  if (!current.needsBirthDate) redirect(returnTo);

  const rawBirthDate = String(formData.get("birthDate") ?? "").trim();
  const birthDate = parseBirthDate(rawBirthDate);

  if (!birthDate || !isPlausibleBirthDate(birthDate)) {
    return failure("Geçerli bir doğum tarihi girin.");
  }

  try {
    await saveVerifiedBirthDate(user.id, birthDate);
  } catch {
    return failure("Yaş bilgisi kaydedilemedi. Lütfen tekrar deneyin.");
  }

  revalidatePath("/hesabim");
  revalidatePath("/kesfet");
  redirect(returnTo);
}

export async function acceptAdultContentAction(formData: FormData) {
  const user = await getCurrentUser();
  const returnTo = safeAdultGateReturnPath(
    String(formData.get("returnTo") ?? ""),
  );

  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(`/yetiskin-icerik-onayi?sonraki=${encodeURIComponent(returnTo)}`)}`);
  }

  if (user.role === "admin") redirect(returnTo);
  if (formData.get("adultConsent") !== "accepted") {
    redirect(`/yetiskin-icerik-onayi?sonraki=${encodeURIComponent(returnTo)}&hata=onay`);
  }

  const access = await getAdultContentAccess(user.id);
  if (access.needsBirthDate) {
    redirect(`/yas-dogrulama?sonraki=${encodeURIComponent(`/yetiskin-icerik-onayi?sonraki=${encodeURIComponent(returnTo)}`)}`);
  }
  if (!access.isAdult) {
    redirect("/erisim-reddedildi?kaynak=18-plus");
  }

  await saveAdultContentConsent(user.id, true);
  revalidatePath("/hesabim");
  revalidatePath("/kesfet");
  revalidatePath("/editor/kesfet");
  revalidatePath("/yayinevi/kesfet/eserler");
  redirect(returnTo);
}

export async function revokeAdultContentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role === "admin") redirect("/hesabim");

  await saveAdultContentConsent(user.id, false);
  revalidatePath("/hesabim");
  revalidatePath("/kesfet");
  revalidatePath("/editor/kesfet");
  revalidatePath("/yayinevi/kesfet/eserler");

  const returnTo = safeAdultGateReturnPath(
    String(formData.get("returnTo") ?? ""),
    "/hesabim#yetiskin-icerik",
  );
  redirect(returnTo);
}
