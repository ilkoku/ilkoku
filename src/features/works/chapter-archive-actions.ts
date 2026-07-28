"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  archiveChapter,
  deleteEmptyChapter,
  restoreChapter,
  rewriteChapter,
} from "./chapter-management";

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

function readRequiredId(
  formData: FormData,
  key: string,
) {
  return String(
    formData.get(key) ?? "",
  ).trim();
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  return error instanceof Error
    ? error.message
    : fallback;
}

export async function archiveChapterAction(
  formData: FormData,
): Promise<void> {
  const authorId = await getWriterId();

  if (!authorId) {
    throw new Error(
      "Bölümü arşivlemek için yazar hesabınla yeniden giriş yapmalısın.",
    );
  }

  const chapterId = readRequiredId(
    formData,
    "chapterId",
  );

  if (!chapterId) {
    throw new Error(
      "Arşivlenecek bölüm seçilemedi.",
    );
  }

  try {
    await archiveChapter(
      authorId,
      chapterId,
    );

    revalidateWriterPaths();
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Bölüm arşivlenemedi.",
      ),
    );
  }
}

export async function deleteEmptyChapterAction(
  formData: FormData,
): Promise<void> {
  const authorId = await getWriterId();

  if (!authorId) {
    throw new Error(
      "Bölümü silmek için yazar hesabınla yeniden giriş yapmalısın.",
    );
  }

  const chapterId = readRequiredId(
    formData,
    "chapterId",
  );

  if (!chapterId) {
    throw new Error(
      "Silinecek bölüm seçilemedi.",
    );
  }

  try {
    await deleteEmptyChapter(
      authorId,
      chapterId,
    );

    revalidateWriterPaths();
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Bölüm silinemedi.",
      ),
    );
  }
}

export async function rewriteChapterAction(
  formData: FormData,
): Promise<void> {
  const authorId = await getWriterId();

  if (!authorId) {
    throw new Error(
      "Bölümü yeniden yazmak için yazar hesabınla yeniden giriş yapmalısın.",
    );
  }

  const chapterId = readRequiredId(
    formData,
    "chapterId",
  );

  if (!chapterId) {
    throw new Error(
      "Yeniden yazılacak bölüm seçilemedi.",
    );
  }

  try {
    await rewriteChapter(
      authorId,
      chapterId,
    );

    revalidateWriterPaths();
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Bölüm yeniden yazıma hazırlanamadı.",
      ),
    );
  }
}

export async function restoreChapterAction(
  formData: FormData,
): Promise<void> {
  const authorId = await getWriterId();

  if (!authorId) {
    throw new Error(
      "Bölümü geri yüklemek için yazar hesabınla yeniden giriş yapmalısın.",
    );
  }

  const chapterId = readRequiredId(
    formData,
    "chapterId",
  );

  const versionId = readRequiredId(
    formData,
    "versionId",
  );

  if (!chapterId || !versionId) {
    throw new Error(
      "Geri yüklenecek bölüm sürümü seçilemedi.",
    );
  }

  try {
    await restoreChapter(
      authorId,
      chapterId,
      versionId,
    );

    revalidateWriterPaths();
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Bölüm sürümü geri yüklenemedi.",
      ),
    );
  }
}