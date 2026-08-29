"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { provisionDemoShowcase } from "@/features/demo-showcase/provision";
import { provisionDemoWriterLevels } from "@/features/demo-showcase/writer-levels";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function provisionDemoShowcaseAction(formData: FormData) {
  const admin = await getCurrentUser();

  if (!admin || admin.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=system_management_demo");
  }

  const password = String(formData.get("password") ?? "");

  try {
    await provisionDemoShowcase({
      actorId: admin.id,
      password,
    });
    await provisionDemoWriterLevels({
      actorId: admin.id,
      password,
    });
  } catch (error) {
    console.error("DEMO_SHOWCASE_PROVISION_FAILED", error);

    if (
      error instanceof Error &&
      error.message === "DEMO_PASSWORD_TOO_WEAK"
    ) {
      redirect("/sistem-yonetimi/demo?durum=zayif-parola");
    }

    redirect("/sistem-yonetimi/demo?durum=hata");
  }

  revalidatePath("/sistem-yonetimi/demo");
  revalidatePath("/eserler");
  revalidatePath("/yazarlar");
  revalidatePath("/yayinevleri");
  revalidatePath("/okuyucu");
  revalidatePath("/yazar");
  revalidatePath("/editor");
  revalidatePath("/yayinevi");

  redirect("/sistem-yonetimi/demo?durum=hazir");
}
