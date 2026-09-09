"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import type { BookStructureItem } from "./book-structure";
import { prepareBookForPublication } from "./book-structure-repository";

type Result = {
  status: "success" | "error";
  message: string;
  items?: BookStructureItem[];
};

const inputSchema = z.object({
  workId: z.string().uuid(),
  chapterId: z.string().uuid(),
  chapterTitle: z.string().trim().min(1).max(200),
});

export async function prepareFullBookPublicationAction(input: {
  workId: string;
  chapterId: string;
  chapterTitle: string;
}): Promise<Result> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Tam kitap yayın bilgileri doğrulanamadı.",
    };
  }

  const writer = await getCurrentUser();
  if (!writer || writer.role !== "writer") {
    return {
      status: "error",
      message: "Eseri yayına hazırlamak için yeniden giriş yapmalısın.",
    };
  }

  try {
    const prepared = await prepareBookForPublication(
      writer.id,
      parsed.data.workId,
      {
        chapterId: parsed.data.chapterId,
        title: parsed.data.chapterTitle,
      },
    );

    revalidatePath("/yazar");
    revalidatePath("/eserlerim");
    revalidatePath("/yazmaya-devam");

    return {
      status: "success",
      message: "Tam kitap yapısı yayına hazırlandı.",
      items: prepared.items,
    };
  } catch (caughtError) {
    console.error("PREPARE_FULL_BOOK_PUBLICATION_ERROR:", caughtError);
    return {
      status: "error",
      message:
        caughtError instanceof Error
          ? caughtError.message
          : "Tam kitap yapısı yayına hazırlanamadı.",
    };
  }
}
