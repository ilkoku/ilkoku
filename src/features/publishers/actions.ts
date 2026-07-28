"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSubmission, withdrawSubmission } from "./mutations";
import type { PublisherActionState } from "./types";
import { createSubmissionSchema, submissionIdSchema } from "./validators";

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
  formData: FormData,
): Promise<PublisherActionState> {
  const parsed = createSubmissionSchema.safeParse({
    coverLetter: formData.get("coverLetter"),
    publisherId: formData.get("publisherId"),
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    return result("error", parsed.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz.");
  }

  const user = await writerUser();
  if (!user) return result("error", "Bu işlem için yazar hesabıyla giriş yapmalısınız.");

  try {
    await createSubmission(user.id, parsed.data);
    refresh();
    return result("success", "Başvurunuz yayınevine iletildi.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return result(
      "error",
      message === "SUBMISSION_EXISTS"
        ? "Bu eser için yayınevinde zaten aktif bir başvurunuz var."
        : "Başvuru gönderilemedi. Lütfen yeniden deneyin.",
    );
  }
}

export async function withdrawPublisherSubmissionAction(id: string): Promise<PublisherActionState> {
  const parsed = submissionIdSchema.safeParse(id);
  if (!parsed.success) return result("error", parsed.error.issues[0]?.message ?? "Geçersiz başvuru.");

  const user = await writerUser();
  if (!user) return result("error", "Bu işlem için yazar hesabıyla giriş yapmalısınız.");

  try {
    await withdrawSubmission(user.id, parsed.data);
    refresh();
    return result("success", "Başvurunuz geri çekildi.");
  } catch {
    return result("error", "Başvuru geri çekilemedi.");
  }
}
