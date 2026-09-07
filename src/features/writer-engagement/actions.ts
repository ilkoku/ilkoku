"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { recordWriterActiveDay } from "@/lib/writer-engagement";

export async function recordWriterActiveDayAction() {
  const user = await getCurrentUser();

  if (!user || user.role !== "writer") {
    return { ok: false as const };
  }

  try {
    const activeDayCount = await recordWriterActiveDay(user.id);
    revalidatePath("/yazar");
    return { ok: true as const, activeDayCount };
  } catch (error) {
    console.error("WRITER_ACTIVE_DAY_RECORD_FAILED", error);
    return { ok: false as const };
  }
}
