"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsPublisher } from "@/lib/cms-access";
import { quarantineMalformedActiveSchedules } from "@/lib/cms-schedule-integrity";
import { runCmsPublishingScheduler } from "@/lib/cms-scheduler";

export async function runCmsSchedulerNowSafeAction() {
  await requireCmsPublisher("/icerik/zamanlama");
  const integrity = await quarantineMalformedActiveSchedules();
  await runCmsPublishingScheduler();
  revalidatePath("/icerik");
  revalidatePath("/icerik/zamanlama");
  redirect(`/icerik/zamanlama?kontrol=1&karantina=${integrity.quarantined}`);
}
