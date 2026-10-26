"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { cancelTest209DemoAccess, isTest209DemoReader } from "./test209-demo-access";

const LIBRARY_PATH = "/kutuphanem/satin-aldiklarim";

/**
 * Explicit reader action. This is a non-commercial QA access revocation.
 * Never changes a real Order/Refund/Payment or payment/ledger records.
 */
export async function cancelTest209DemoAccessAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=%2Fkutuphanem%2Fsatin-aldiklarim");
  if (!isTest209DemoReader(user) || user.status !== "active") {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const id = formData.get("entitlementId");
  const confirmed = formData.get("confirmCancel");
  if (typeof id !== "string" ||
    !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id) ||
    confirmed !== "on") {
    redirect(`${LIBRARY_PATH}?durum=iptal-onayi-gerekli`);
  }

  const result = await cancelTest209DemoAccess(user.id, id);
  if (!result.ok) {
    redirect(`${LIBRARY_PATH}?durum=iptal-gerceklestirilemedi`);
  }

  revalidatePath(LIBRARY_PATH);
  revalidatePath("/okuyucu");
  revalidatePath("/okumaya-devam");
  revalidatePath("/kitap/yeni-test209-30820c6a");
  redirect(`${LIBRARY_PATH}?durum=deneme-iptal-edildi`);
}
