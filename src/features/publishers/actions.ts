"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withdrawLegacyPublisherSubmission } from "@/features/publisher-submissions/legacy-security";
import type { PublisherActionState } from "./types";
import { submissionIdSchema } from "./validators";

const result = (status: PublisherActionState["status"], message: string): PublisherActionState => ({ message, status });

async function writerUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "writer") return null;
  return user;
}

function refresh() {
  revalidatePath("/yayinevleri");
  revalidatePath("/yazar");
}

export async function createPublisherSubmissionAction(
  _state: PublisherActionState,
  _formData: FormData,
): Promise<PublisherActionState> {
  return result(
    "error",
    "Yeni doğrudan yayınevi başvuruları kapatıldı. Yayınevleri eserleri İlkOku keşif alanından inceler.",
  );
}

export async function withdrawPublisherSubmissionAction(id: string): Promise<PublisherActionState> {
  const parsed = submissionIdSchema.safeParse(id);
  if (!parsed.success) return result("error", parsed.error.issues[0]?.message ?? "Geçersiz başvuru.");

  const user = await writerUser();
  if (!user) return result("error", "Bu işlem için yazar hesabıyla giriş yapmalısınız.");

  try {
    const withdrawal = await withdrawLegacyPublisherSubmission(user.id, parsed.data);
    if (withdrawal.count === 0) throw new Error("SUBMISSION_NOT_FOUND");
    refresh();
    return result("success", "Başvurunuz geri çekildi.");
  } catch {
    return result("error", "Başvuru geri çekilemedi.");
  }
}
