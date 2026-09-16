"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getChapterFormatting,
  saveChapterFormatting,
} from "./chapter-formatting-repository";
import {
  parseChapterFormatting,
  serializeChapterFormatting,
} from "./rich-text-formatting";
import { worksRepository } from "./repository";

async function ownedChapter(
  workId: string,
  chapterId: string,
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "writer") return null;

  const chapter = await worksRepository.getAuthorChapterById(
    user.id,
    workId,
    chapterId,
  );
  return chapter ? { chapter, user } : null;
}

export async function getWriterChapterFormattingAction({
  chapterId,
  content,
  workId,
}: {
  chapterId: string;
  content: string;
  workId: string;
}) {
  const owned = await ownedChapter(workId, chapterId);
  if (!owned) return "";

  const raw = await getChapterFormatting(chapterId);
  try {
    return serializeChapterFormatting(
      parseChapterFormatting(raw, content),
    );
  } catch {
    return "";
  }
}

export async function saveWriterChapterFormattingAction({
  chapterId,
  content,
  formatting,
  workId,
}: {
  chapterId: string;
  content: string;
  formatting: string;
  workId: string;
}) {
  const owned = await ownedChapter(workId, chapterId);
  if (!owned) {
    return { ok: false as const, message: "Bölüm biçimi kaydedilemedi." };
  }

  try {
    const normalized = serializeChapterFormatting(
      parseChapterFormatting(formatting, content),
    );
    await saveChapterFormatting(chapterId, normalized);
    return { ok: true as const, formatting: normalized };
  } catch (caughtError) {
    return {
      ok: false as const,
      message:
        caughtError instanceof Error
          ? caughtError.message
          : "Bölüm biçimi kaydedilemedi.",
    };
  }
}
