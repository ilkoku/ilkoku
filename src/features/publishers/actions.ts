"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { createSubmission, withdrawSubmission } from "./mutations";
import type { PublisherActionState } from "./types";
import { createSubmissionSchema, submissionIdSchema } from "./validators";

const result = (status: PublisherActionState["status"], message: string): PublisherActionState => ({ message, status });

async function writerClient() {
  const user = await getCurrentUser();
  if (!user || user.role !== "writer") return null;

  const client = await createClient();
  return client;
}

function refresh() { revalidatePath("/yayinevleri"); revalidatePath("/yazar"); }

export async function createPublisherSubmissionAction(_state: PublisherActionState, formData: FormData): Promise<PublisherActionState> {
  const parsed = createSubmissionSchema.safeParse({ coverLetter: formData.get("coverLetter"), publisherId: formData.get("publisherId"), workId: formData.get("workId") });
  if (!parsed.success) return result("error", parsed.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz.");
  const client = await writerClient();
  if (!client) return result("error", "Bu işlem için yazar hesabıyla giriş yapmalısınız.");
  try { await createSubmission(client, parsed.data); refresh(); return result("success", "Başvurunuz yayınevine iletildi."); }
  catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    return result("error", code === "23505" ? "Bu eser için yayınevinde zaten aktif bir başvurunuz var." : "Başvuru gönderilemedi. Lütfen yeniden deneyin.");
  }
}

export async function withdrawPublisherSubmissionAction(id: string): Promise<PublisherActionState> {
  const parsed = submissionIdSchema.safeParse(id);
  if (!parsed.success) return result("error", parsed.error.issues[0]?.message ?? "Geçersiz başvuru.");
  const client = await writerClient();
  if (!client) return result("error", "Bu işlem için yazar hesabıyla giriş yapmalısınız.");
  try { await withdrawSubmission(client, parsed.data); refresh(); return result("success", "Başvurunuz geri çekildi."); }
  catch { return result("error", "Başvuru geri çekilemedi."); }
}
