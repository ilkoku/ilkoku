"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import {
  archiveWork,
  createNextChapter,
  createWorkWithFirstChapter,
  publishWork,
  restoreWork,
  saveChapterDraft,
  updateWork,
} from "./mutations";
import type { WorkActionState } from "./types";
import {
  chapterDraftSchema,
  createWorkSchema,
  updateWorkSchema,
  workIdSchema,
} from "./validators";

function error(message: string): WorkActionState {
  return { message, status: "error" };
}

async function authenticatedClient() {
  const user = await getCurrentUser();
  if (!user || user.role !== "writer") return null;

  const client = await createClient();
  return { authorId: user.id, client };
}

function revalidateWorkPaths(slug?: string) {
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  if (slug) revalidatePath(`/kitap/${slug}`);
}

async function updateSubmittedMetadata(
  auth: NonNullable<Awaited<ReturnType<typeof authenticatedClient>>>,
  formData: FormData,
) {
  const workTitle = formData.get("workTitle");
  if (typeof workTitle !== "string") return;

  const parsed = updateWorkSchema.safeParse({
    genre: formData.get("genre") || undefined,
    id: formData.get("workId"),
    summary: formData.get("summary") || undefined,
    title: workTitle,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Eser bilgileri geçersiz.");
  await updateWork(auth.client, auth.authorId, parsed.data);
}

export async function createWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = createWorkSchema.safeParse({
    genre: formData.get("genre"),
    summary: formData.get("summary"),
    title: formData.get("title"),
    workType: formData.get("workType") || undefined,
  });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Eser bilgileri geçersiz.");

  const auth = await authenticatedClient();
  if (!auth) return error("Eser oluşturmak için yeniden giriş yapmalısın.");

  try {
    const { chapter, work } = await createWorkWithFirstChapter(auth.client, auth.authorId, parsed.data);
    revalidateWorkPaths(work.slug);
    return {
      chapterId: chapter.id,
      message: "Eserin oluşturuldu. İlk bölümünü yazmaya başlayabilirsin.",
      status: "success",
      workId: work.id,
      workSlug: work.slug,
    };
  } catch {
    return error("Eser oluşturulamadı. Bilgilerini kontrol edip tekrar dene.");
  }
}

export async function updateWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = updateWorkSchema.safeParse({
    genre: formData.get("genre") || undefined,
    coverUrl: formData.get("coverUrl") ?? undefined,
    id: formData.get("workId"),
    language: formData.get("language") || undefined,
    summary: formData.get("summary") || undefined,
    status: formData.get("status") || undefined,
    title: formData.get("title") || undefined,
    workType: formData.get("workType") || undefined,
  });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Eser bilgileri geçersiz.");
  const auth = await authenticatedClient();
  if (!auth) return error("Eseri güncellemek için yeniden giriş yapmalısın.");

  try {
    const work = await updateWork(auth.client, auth.authorId, parsed.data);
    revalidateWorkPaths(work.slug);
    return { message: "Eser bilgileri güncellendi.", status: "success", workId: parsed.data.id };
  } catch {
    return error("Eser bilgileri güncellenemedi.");
  }
}

export async function saveChapterDraftAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = chapterDraftSchema.safeParse({
    chapterId: formData.get("chapterId"),
    content: formData.get("content"),
    title: formData.get("chapterTitle"),
    workId: formData.get("workId"),
  });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Bölüm bilgileri geçersiz.");
  const auth = await authenticatedClient();
  if (!auth) return error("Taslağı kaydetmek için yeniden giriş yapmalısın.");

  try {
    await updateSubmittedMetadata(auth, formData);
    await saveChapterDraft(auth.client, auth.authorId, parsed.data);
    revalidateWorkPaths();
    return {
      chapterId: parsed.data.chapterId,
      message: "Taslak kaydedildi.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch {
    return error("Taslak kaydedilemedi. Lütfen tekrar dene.");
  }
}

export async function publishWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = chapterDraftSchema.safeParse({
    chapterId: formData.get("chapterId"),
    content: formData.get("content"),
    title: formData.get("chapterTitle"),
    workId: formData.get("workId"),
  });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Bölüm bilgileri geçersiz.");
  if (!parsed.data.content.trim()) return error("Yayınlamadan önce bölüm metnini yazmalısın.");
  const auth = await authenticatedClient();
  if (!auth) return error("Eseri yayınlamak için yeniden giriş yapmalısın.");

  try {
    await updateSubmittedMetadata(auth, formData);
    const work = await publishWork(auth.client, auth.authorId, parsed.data);
    revalidateWorkPaths(work.slug);
    revalidatePath(`/kitap/${work.slug}`);
    revalidatePath(`/oku/${work.slug}/bolum-1`);
    return {
      chapterId: parsed.data.chapterId,
      message: "Eserin yayınlandı.",
      status: "success",
      workId: parsed.data.workId,
      workSlug: work.slug,
    };
  } catch {
    return error("Eser yayınlanamadı. Lütfen tekrar dene.");
  }
}

export async function archiveWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = workIdSchema.safeParse({ workId: formData.get("workId") });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Geçerli bir eser seçilmelidir.");
  const auth = await authenticatedClient();
  if (!auth) return error("Eseri arşivlemek için yeniden giriş yapmalısın.");

  try {
    await archiveWork(auth.client, auth.authorId, parsed.data.workId);
    revalidateWorkPaths();
    return { message: "Eser arşive taşındı.", status: "success", workId: parsed.data.workId };
  } catch {
    return error("Eser arşive taşınamadı.");
  }
}

export async function restoreWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = workIdSchema.safeParse({ workId: formData.get("workId") });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Geçerli bir eser seçilmelidir.");
  const auth = await authenticatedClient();
  if (!auth) return error("Eseri geri almak için writer rolüyle giriş yapmalısın.");

  try {
    await restoreWork(auth.client, auth.authorId, parsed.data.workId);
    revalidateWorkPaths();
    return { message: "Eser arşivden çıkarıldı.", status: "success", workId: parsed.data.workId };
  } catch {
    return error("Eser arşivden çıkarılamadı.");
  }
}

export async function createNextChapterAction(formData: FormData) {
  const parsed = workIdSchema.safeParse({ workId: formData.get("workId") });
  if (!parsed.success) redirect("/eserlerim");
  const auth = await authenticatedClient();
  if (!auth) redirect("/giris?sonraki=/yazmaya-devam");
  await createNextChapter(auth.client, auth.authorId, parsed.data.workId);
  revalidateWorkPaths();
  redirect("/yazmaya-devam");
}
