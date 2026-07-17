import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createWorksRepository } from "./repository";
import type { PublicChapterDetail, PublicWorkDetail, WorkWithChapterSummary } from "./types";

export const getAuthorWorks = cache(async (authorId: string): Promise<WorkWithChapterSummary[]> => {
  const client = await createClient();
  const repository = createWorksRepository(client);
  const { data: works, error } = await repository.getAuthorWorks(authorId);
  if (error) throw error;

  const { data: chapters, error: chapterError } = await repository.getChaptersForWorks(
    authorId,
    works.map((work) => work.id),
  );
  if (chapterError) throw chapterError;

  const chaptersByWork = new Map<string, typeof chapters>();
  chapters.forEach((chapter) => {
    const collection = chaptersByWork.get(chapter.work_id) ?? [];
    collection.push(chapter);
    chaptersByWork.set(chapter.work_id, collection);
  });

  return works.map((work) => {
    const workChapters = chaptersByWork.get(work.id) ?? [];
    const latest = [...workChapters].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    return {
      ...work,
      chapterCount: workChapters.length,
      latestChapter: latest
          ? {
            content: latest.content,
            id: latest.id,
            position: latest.position,
            slug: latest.slug,
            status: latest.status,
            title: latest.title,
            updatedAt: latest.updated_at,
            wordCount: latest.word_count,
          }
        : null,
      totalWords: workChapters.reduce((total, chapter) => total + chapter.word_count, 0),
    };
  });
});

export const getAuthorWorkspaceWorks = cache(async (authorId: string): Promise<WorkWithChapterSummary[]> => {
  const client = await createClient();
  const repository = createWorksRepository(client);
  const { data: works, error } = await repository.getAuthorWorks(authorId, true);
  if (error) throw error;

  const { data: chapters, error: chapterError } = await repository.getChaptersForWorks(
    authorId,
    works.map((work) => work.id),
  );
  if (chapterError) throw chapterError;

  const chaptersByWork = new Map<string, typeof chapters>();
  chapters.forEach((chapter) => {
    const collection = chaptersByWork.get(chapter.work_id) ?? [];
    collection.push(chapter);
    chaptersByWork.set(chapter.work_id, collection);
  });

  return works.map((work) => {
    const workChapters = chaptersByWork.get(work.id) ?? [];
    const latest = [...workChapters].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    return {
      ...work,
      chapterCount: workChapters.length,
      latestChapter: latest ? {
        content: latest.content,
        id: latest.id,
        position: latest.position,
        slug: latest.slug,
        status: latest.status,
        title: latest.title,
        updatedAt: latest.updated_at,
        wordCount: latest.word_count,
      } : null,
      totalWords: workChapters.reduce((total, chapter) => total + chapter.word_count, 0),
    };
  });
});

export async function getContinueWritingWork(authorId: string, workId?: string, chapterId?: string) {
  const works = await getAuthorWorks(authorId);
  const selected = (workId ? works.find((work) => work.id === workId) : works[0]) ?? works[0] ?? null;
  if (!selected || !chapterId || selected.latestChapter?.id === chapterId) return selected;

  const client = await createClient();
  const { data: chapter, error } = await createWorksRepository(client).getAuthorChapterById(authorId, selected.id, chapterId);
  if (error) throw error;
  if (!chapter) return selected;
  return {
    ...selected,
    latestChapter: {
      content: chapter.content,
      id: chapter.id,
      position: chapter.position,
      slug: chapter.slug,
      status: chapter.status,
      title: chapter.title,
      updatedAt: chapter.updated_at,
      wordCount: chapter.word_count,
    },
  } satisfies WorkWithChapterSummary;
}

export const getPublicWorkBySlug = cache(async (slug: string): Promise<PublicWorkDetail | null> => {
  const client = await createClient();
  const repository = createWorksRepository(client);
  const { data: work, error } = await repository.getPublicWork(slug);
  if (error) throw error;
  if (!work) return null;

  const { count, error: countError } = await repository.getPublishedChapterCount(work.id);
  if (countError) throw countError;

  return {
    ...work,
    authorName: "İlkOku Yazarı",
    chapterCount: count ?? 0,
  };
});

export const getPublicChapter = cache(
  async (workSlug: string, chapterSlug: string): Promise<PublicChapterDetail | null> => {
    const work = await getPublicWorkBySlug(workSlug);
    if (!work) return null;

    const client = await createClient();
    const repository = createWorksRepository(client);
    const { data: chapter, error } = await repository.getPublicChapter(work.id, chapterSlug);
    if (error) throw error;
    if (!chapter) return null;

    return { ...chapter, work };
  },
);
