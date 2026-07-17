import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WorkType } from "@/types/database";
import { createWorksRepository } from "./repository";
import type { ChapterDraftInput, CreateWorkInput, UpdateWorkInput } from "./validators";

const workTypeByGenre: Record<string, WorkType> = {
  "Bilim Kurgu": "novel",
  Fantastik: "novel",
  Polisiye: "novel",
  Roman: "novel",
  Öykü: "story",
};

export function createSlug(value: string) {
  const transliterated = value
    .trim()
    .toLocaleLowerCase("tr")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ü", "u");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "yeni-eser";
}

async function createUniqueSlug(
  client: SupabaseClient<Database>,
  authorId: string,
  title: string,
) {
  const repository = createWorksRepository(client);
  const base = `${createSlug(title)}-${crypto.randomUUID().slice(0, 8)}`;

  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const { data, error } = await repository.findAuthorWorkBySlug(authorId, candidate);
    if (error) throw error;
    if (!data) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createWorkWithFirstChapter(
  client: SupabaseClient<Database>,
  authorId: string,
  input: CreateWorkInput,
) {
  const repository = createWorksRepository(client);
  const slug = await createUniqueSlug(client, authorId, input.title);
  const { data: work, error: workError } = await repository.createWork({
    author_id: authorId,
    genre: input.genre,
    slug,
    status: "draft",
    summary: input.summary || null,
    title: input.title,
    work_type: input.workType ?? workTypeByGenre[input.genre] ?? "other",
  });
  if (workError) throw workError;

  const { data: chapter, error: chapterError } = await repository.createChapter({
    author_id: authorId,
    position: 1,
    slug: "bolum-1",
    status: "draft",
    title: "Bölüm 1",
    work_id: work.id,
  });

  if (chapterError) {
    await repository.archiveWork(authorId, work.id);
    throw chapterError;
  }

  return { chapter, work };
}

export async function updateWork(
  client: SupabaseClient<Database>,
  authorId: string,
  input: UpdateWorkInput,
) {
  const { id, ...changes } = input;
  const repository = createWorksRepository(client);
  const update = {
    cover_url: changes.coverUrl === "" ? null : changes.coverUrl,
    genre: changes.genre,
    language: changes.language,
    summary: changes.summary,
    title: changes.title,
    work_type: changes.workType,
    ...(changes.status === "published"
      ? { is_public: true, published_at: new Date().toISOString(), status: "published" as const }
      : changes.status
        ? { is_public: false, status: changes.status }
        : {}),
  };
  const { data, error } = await repository.updateWork(authorId, id, update);
  if (error) throw error;
  return data;
}

export async function saveChapterDraft(
  client: SupabaseClient<Database>,
  authorId: string,
  input: ChapterDraftInput,
) {
  const repository = createWorksRepository(client);
  const { data, error } = await repository.updateChapter(authorId, input.chapterId, {
    content: input.content,
    status: "draft",
    title: input.title,
  });
  if (error) throw error;

  const { error: workError } = await repository.updateWork(authorId, input.workId, {
    status: "in_progress",
  });
  if (workError) throw workError;
  return data;
}

export async function publishWork(
  client: SupabaseClient<Database>,
  authorId: string,
  input: ChapterDraftInput,
) {
  const repository = createWorksRepository(client);
  await saveChapterDraft(client, authorId, input);

  const { error: chapterError } = await repository.publishChapter(authorId, input.chapterId);
  if (chapterError) throw chapterError;

  const { data, error } = await repository.publishWork(authorId, input.workId);
  if (error) throw error;
  return data;
}

export async function archiveWork(
  client: SupabaseClient<Database>,
  authorId: string,
  workId: string,
) {
  const repository = createWorksRepository(client);
  const { data, error } = await repository.archiveWork(authorId, workId);
  if (error) throw error;
  return data;
}

export async function restoreWork(
  client: SupabaseClient<Database>,
  authorId: string,
  workId: string,
) {
  const repository = createWorksRepository(client);
  const { data, error } = await repository.restoreWork(authorId, workId);
  if (error) throw error;
  return data;
}

export async function createNextChapter(
  client: SupabaseClient<Database>,
  authorId: string,
  workId: string,
) {
  const repository = createWorksRepository(client);
  const { data: latest, error: latestError } = await repository.getLatestChapterPosition(authorId, workId);
  if (latestError) throw latestError;
  const position = (latest?.position ?? 0) + 1;
  const { data, error } = await repository.createChapter({
    author_id: authorId,
    position,
    slug: `bolum-${position}`,
    status: "draft",
    title: `Bölüm ${position}`,
    work_id: workId,
  });
  if (error) throw error;
  return data;
}
