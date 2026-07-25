"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  archiveChapter,
  deleteEmptyChapter,
  restoreChapter,
  rewriteChapter,
} from "./chapter-management";

export type ChapterArchiveActionResult = {
  chapterId?: string;
  message: string;
  status: "error" | "success";
};

function revalidateWriterPaths() {
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
}

async function getWriterId() {
  const user = await getCurrentUser();

  if (!user || user.role !== "writer") {
    return null;
  }

  return user.id;
}

function readRequiredId(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function actionError(error: unknown, fallback: string): ChapterArchiveActionResult {
  return {
    message: error instanceof Error ? error.message : fallback,
    status: "error",
  };
}

export async function archiveChapterAction(
  formData: FormData,
): Promise<ChapterArchiveActionResult> {
  const authorId = await getWriterId();

  if (!authorId) {
    return {
      message: "Bölümü arşivlemek için yazar hesabınla yeniden giriş yapmalısın.",
      status: "error",
    };
  }

  const chapterId = readRequiredId(formData, "chapterId");

  if (!chapterId) {
    return {
      message: "Arşivlenecek bölüm seçilemedi.",
      status: "error",
    };
  }

  try {
    await archiveChapter(authorId, chapterId);
    revalidateWriterPaths();

    return {
      chapterId,
      message: "Bölüm güvenli şekilde arşive alındı.",
      status: "success",
    };
  } catch (error) {
    return actionError(error, "Bölüm arşivlenemedi.");
  }
}

export async function deleteEmptyChapterAction(
  formData: FormData,
): Promise<ChapterArchiveActionResult> {
  const authorId = await getWriterId();

  if (!authorId) {
    return {
      message: "Bölümü silmek için yazar hesabınla yeniden giriş yapmalısın.",
      status: "error",
    };
  }

  const chapterId = readRequiredId(formData, "chapterId");

  if (!chapterId) {
    return {
      message: "Silinecek bölüm seçilemedi.",
      status: "error",
    };
  }

  try {
    await deleteEmptyChapter(authorId, chapterId);
    revalidateWriterPaths();

    return {
      chapterId,
      message: "Boş bölüm silindi.",
      status: "success",
    };
  } catch (error) {
    return actionError(error, "Bölüm silinemedi.");
  }
}

export async function rewriteChapterAction(
  formData: FormData,
): Promise<ChapterArchiveActionResult> {
  const authorId = await getWriterId();

  if (!authorId) {
    return {
      message: "Bölümü yeniden yazmak için yazar hesabınla yeniden giriş yapmalısın.",
      status: "error",
    };
  }

  const chapterId = readRequiredId(formData, "chapterId");

  if (!chapterId) {
    return {
      message: "Yeniden yazılacak bölüm seçilemedi.",
      status: "error",
    };
  }

  try {
    await rewriteChapter(authorId, chapterId);
    revalidateWriterPaths();

    return {
      chapterId,
      message: "Mevcut sürüm arşive alındı ve bölüm yeniden yazıma hazırlandı.",
      status: "success",
    };
  } catch (error) {
    return actionError(error, "Bölüm yeniden yazıma hazırlanamadı.");
  }
}

export async function restoreChapterAction(
  formData: FormData,
): Promise<ChapterArchiveActionResult> {
  const authorId = await getWriterId();

  if (!authorId) {
    return {
      message: "Bölümü geri yüklemek için yazar hesabınla yeniden giriş yapmalısın.",
      status: "error",
    };
  }

  const chapterId = readRequiredId(formData, "chapterId");
  const versionId = readRequiredId(formData, "versionId");

  if (!chapterId || !versionId) {
    return {
      message: "Geri yüklenecek bölüm sürümü seçilemedi.",
      status: "error",
    };
  }

  try {
    await restoreChapter(authorId, chapterId, versionId);
    revalidateWriterPaths();

    return {
      chapterId,
      message: "Seçilen sürüm geri yüklendi; mevcut sürüm arşive alındı.",
      status: "success",
    };
  } catch (error) {
    return actionError(error, "Bölüm sürümü geri yüklenemedi.");
  }
}
