"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { provisionDemoShowcase } from "@/features/demo-showcase/provision";
import { provisionDemoWriterLevels } from "@/features/demo-showcase/writer-levels";
import { getCurrentUser } from "@/lib/auth/current-user";

function safeProvisionErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    if (/^[A-Z0-9_]{2,40}$/.test(code)) return code;
  }

  if (error instanceof Error) {
    if (error.message === "DEMO_PASSWORD_TOO_WEAK") {
      return "DEMO_PASSWORD_TOO_WEAK";
    }
    if (error.message === "DEMO_SHOWCASE_SUPPORT_ACCOUNTS_MISSING") {
      return "DEMO_SUPPORT_MISSING";
    }
    if (error.message === "DEMO_WRITER_MISSING") {
      return "DEMO_WRITER_MISSING";
    }

    const normalized = error.message.toLocaleLowerCase("en-US");
    if (normalized.includes("transaction") && normalized.includes("timeout")) {
      return "TX_TIMEOUT";
    }
    if (
      normalized.includes("transaction") &&
      normalized.includes("already closed")
    ) {
      return "TX_CLOSED";
    }
  }

  return "UNKNOWN";
}

function redirectProvisionFailure(phase: "temel" | "yazarlar", error: unknown) {
  console.error(`DEMO_SHOWCASE_PROVISION_FAILED:${phase}`, error);

  const code = safeProvisionErrorCode(error);
  if (code === "DEMO_PASSWORD_TOO_WEAK") {
    redirect("/sistem-yonetimi/demo?durum=zayif-parola");
  }

  redirect(
    `/sistem-yonetimi/demo?durum=hata&asama=${phase}&kod=${encodeURIComponent(code)}`,
  );
}

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
  } catch (error) {
    redirectProvisionFailure("temel", error);
  }

  try {
    await provisionDemoWriterLevels({
      actorId: admin.id,
      password,
    });
  } catch (error) {
    redirectProvisionFailure("yazarlar", error);
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
