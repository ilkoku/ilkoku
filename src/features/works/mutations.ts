import { worksRepository } from "./repository";
import type {
  ChapterDraftInput,
  CreateWorkInput,
  UpdateWorkInput,
} from "./validators";

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

  return (
    transliterated
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "yeni-eser"
  );
}

async function createUniqueSlug(
  authorId: string,
  title: string,
) {
  const base = `${createSlug(title)}-${crypto.randomUUID().slice(0, 8)}`;

  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const candidate =
      suffix === 1 ? base : `${base}-${suffix}`;

    const existingWork =
      await worksRepository.findAuthorWorkBySlug(
        authorId,
        candidate,
      );

    if (!existingWork) {
      return candidate;
    }
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createWorkWithFirstChapter(
  authorId: string,
  input: CreateWorkInput,
) {
  const slug = await createUniqueSlug(
    authorId,
    input.title,
  );

  const work = await worksRepository.createWork({
    authorId,
    description: input.summary || null,
    genre: input.genre || null,
    language: "tr",
    slug,
    title: input.title,
  });

  try {
    const chapter =
      await worksRepository.createChapter({
        authorId,
        content: "",
        position: 1,
        status: "draft",
        title: "Bölüm 1",
        workId: work.id,
      });

    return {
      chapter,
      work,
    };
  } catch (caughtError) {
    await worksRepository.deleteWorkAfterFailedCreation(
      authorId,
      work.id,
    );

    throw caughtError;
  }
}

export async function updateWork(
  authorId: string,
  input: UpdateWorkInput,
) {
  const { id, ...changes } = input;

  const status =
    changes.status === "published"
      ? "published"
      : changes.status === "in_progress"
        ? "in_review"
        : changes.status === "draft"
          ? "draft"
          : undefined;

  return worksRepository.updateWork(
    authorId,
    id,
    {
      coverUrl:
        changes.coverUrl === ""
          ? null
          : changes.coverUrl,
      description: changes.summary,
      genre: changes.genre,
      language: changes.language,
      status,
      title: changes.title,
      ...(status === "published"
        ? {
            archivedAt: null,
            publishedAt: new Date(),
            visibility: "public",
          }
        : status
          ? {
              archivedAt: null,
              publishedAt: null,
              visibility: "private",
            }
          : {}),
    },
  );
}

export async function saveChapterDraft(
  authorId: string,
  input: ChapterDraftInput,
) {
  const chapter =
    await worksRepository.updateChapter(
      authorId,
      input.chapterId,
      {
        archivedAt: null,
        content: input.content,
        publishedAt: null,
        status: "draft",
        title: input.title,
      },
    );

  await worksRepository.updateWork(
    authorId,
    input.workId,
    {
      archivedAt: null,
      status: "draft",
      visibility: "private",
    },
  );

  return chapter;
}

export async function publishWork(
  authorId: string,
  input: ChapterDraftInput,
) {
  await saveChapterDraft(authorId, input);

  await worksRepository.publishChapter(
    authorId,
    input.chapterId,
  );

  return worksRepository.publishWork(
    authorId,
    input.workId,
  );
}

export async function archiveWork(
  authorId: string,
  workId: string,
) {
  return worksRepository.archiveWork(
    authorId,
    workId,
  );
}

export async function restoreWork(
  authorId: string,
  workId: string,
) {
  return worksRepository.restoreWork(
    authorId,
    workId,
  );
}

export async function createNextChapter(
  authorId: string,
  workId: string,
) {
  const work =
    await worksRepository.getAuthorWorkById(
      authorId,
      workId,
    );

  if (!work) {
    throw new Error(
      "Eser bulunamadı veya bu esere bölüm ekleme yetkin yok.",
    );
  }

  const latestChapter =
    await worksRepository.getLatestChapterPosition(
      authorId,
      workId,
    );

  const position =
    (latestChapter?.position ?? 0) + 1;

  return worksRepository.createChapter({
    authorId,
    content: "",
    position,
    status: "draft",
    title: `Bölüm ${position}`,
    workId,
  });
}