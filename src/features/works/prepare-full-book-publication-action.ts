"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getChapterFormattingMap } from "./chapter-formatting-repository";
import type { BookStructureItem } from "./book-structure";
import { prepareBookForPublication } from "./book-structure-repository";

type PreparedPublicationItem = BookStructureItem & {
  formatting: string;
};

type Result = {
  status: "success" | "error";
  message: string;
  items?: PreparedPublicationItem[];
  coverUrl?: string | null;
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
    const work = await prisma.work.findFirst({
      where: {
        archivedAt: null,
        authorId: writer.id,
        id: parsed.data.workId,
      },
      select: {
        coverUrl: true,
      },
    });

    if (!work) {
      return {
        status: "error",
        message: "Yayına hazırlanacak eser bulunamadı.",
      };
    }

    const prepared = await prepareBookForPublication(
      writer.id,
      parsed.data.workId,
      {
        chapterId: parsed.data.chapterId,
        title: parsed.data.chapterTitle,
      },
    );
    const chapterIds = prepared.items
      .map((item) => item.chapterId)
      .filter((chapterId): chapterId is string => Boolean(chapterId));
    const formattingByChapter = await getChapterFormattingMap(chapterIds);
    const items: PreparedPublicationItem[] = prepared.items.map((item) => ({
      ...item,
      formatting: item.chapterId
        ? formattingByChapter.get(item.chapterId) ?? ""
        : "",
    }));

    revalidatePath("/yazar");
    revalidatePath("/eserlerim");
    revalidatePath("/yazmaya-devam");

    return {
      status: "success",
      message: "Tam kitap yapısı yayına hazırlandı.",
      items,
      coverUrl: work.coverUrl,
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
