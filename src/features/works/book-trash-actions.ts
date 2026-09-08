"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";

import type { BookTrashItem } from "./book-trash";
import {
  emptyBookTrash,
  getBookTrash,
  moveBookStructureItemToTrash,
  restoreBookTrashItem,
} from "./book-trash-repository";

type TrashActionResult = {
  status: "success" | "error";
  message: string;
  trash?: BookTrashItem[];
};

const idSchema = z.string().uuid();

async function authenticatedWriter() {
  const user = await getCurrentUser();
  return user?.role === "writer" ? user : null;
}

function error(message: string): TrashActionResult {
  return { status: "error", message };
}

function revalidateWriterPaths() {
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
}

export async function loadBookTrashAction(
  workIdValue: string,
): Promise<TrashActionResult> {
  const workId = idSchema.safeParse(workIdValue);

  if (!workId.success) return error("Geçerli bir eser seçilmelidir.");

  const writer = await authenticatedWriter();
  if (!writer) return error("Çöp kutusunu görmek için yazar hesabınla giriş yapmalısın.");

  try {
    return {
      status: "success",
      message: "Çöp kutusu yüklendi.",
      trash: await getBookTrash(writer.id, workId.data),
    };
  } catch (caughtError) {
    console.error("LOAD_BOOK_TRASH_ERROR:", caughtError);
    return error(
      caughtError instanceof Error ? caughtError.message : "Çöp kutusu yüklenemedi.",
    );
  }
}

export async function trashBookStructureItemAction(input: {
  workId: string;
  structureItemId: string;
}): Promise<TrashActionResult> {
  const workId = idSchema.safeParse(input.workId);
  const structureItemId = idSchema.safeParse(input.structureItemId);

  if (!workId.success || !structureItemId.success) {
    return error("Silinecek kitap öğesi seçilemedi.");
  }

  const writer = await authenticatedWriter();
  if (!writer) return error("Kitap öğesini silmek için yeniden giriş yapmalısın.");

  try {
    const trash = await moveBookStructureItemToTrash(
      writer.id,
      workId.data,
      structureItemId.data,
    );
    revalidateWriterPaths();

    return {
      status: "success",
      message: "Öğe çöp kutusuna taşındı.",
      trash,
    };
  } catch (caughtError) {
    console.error("TRASH_BOOK_STRUCTURE_ITEM_ERROR:", caughtError);
    return error(
      caughtError instanceof Error ? caughtError.message : "Öğe çöp kutusuna taşınamadı.",
    );
  }
}

export async function restoreBookTrashItemAction(input: {
  workId: string;
  trashItemId: string;
}): Promise<TrashActionResult> {
  const workId = idSchema.safeParse(input.workId);
  const trashItemId = idSchema.safeParse(input.trashItemId);

  if (!workId.success || !trashItemId.success) {
    return error("Geri yüklenecek öğe seçilemedi.");
  }

  const writer = await authenticatedWriter();
  if (!writer) return error("Öğeyi geri yüklemek için yeniden giriş yapmalısın.");

  try {
    const trash = await restoreBookTrashItem(
      writer.id,
      workId.data,
      trashItemId.data,
    );
    revalidateWriterPaths();

    return {
      status: "success",
      message: "Öğe kitap yapısına geri yüklendi.",
      trash,
    };
  } catch (caughtError) {
    console.error("RESTORE_BOOK_TRASH_ITEM_ERROR:", caughtError);
    return error(
      caughtError instanceof Error ? caughtError.message : "Öğe geri yüklenemedi.",
    );
  }
}

export async function emptyBookTrashAction(
  workIdValue: string,
): Promise<TrashActionResult> {
  const workId = idSchema.safeParse(workIdValue);

  if (!workId.success) return error("Geçerli bir eser seçilmelidir.");

  const writer = await authenticatedWriter();
  if (!writer) return error("Çöp kutusunu boşaltmak için yeniden giriş yapmalısın.");

  try {
    await emptyBookTrash(writer.id, workId.data);
    revalidateWriterPaths();

    return {
      status: "success",
      message: "Çöp kutusu kalıcı olarak boşaltıldı.",
      trash: [],
    };
  } catch (caughtError) {
    console.error("EMPTY_BOOK_TRASH_ERROR:", caughtError);
    return error(
      caughtError instanceof Error ? caughtError.message : "Çöp kutusu boşaltılamadı.",
    );
  }
}
