import { worksRepository } from "./repository";
import {
  deliverPublicationNotifications,
} from "./publication-notifications";
import type { PublicationLayoutSnapshot } from "./publication-layout";
import { publishWorkWithEvent } from "./publish-work-event";
import type {
  ChapterDraftInput,
  CreateWorkInput,
  UpdateWorkInput,
  WriterMetadataInput,
} from "./validators";
import { serializeWorkContentWarnings } from "@/lib/work-content-classification";

function hasMeaningfulText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .length > 0;
}

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
    contentRating: input.contentRating,
    contentWarnings: serializeWorkContentWarnings(input.contentWarnings),
    contentRatingConfirmedAt: new Date(),
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
  const existingWork = await worksRepository.getAuthorWorkById(
    authorId,
    id,
  );

  if (!existingWork) {
    throw new Error(
      "Eser bulunamadı veya bu eseri düzenleme yetkin yok.",
    );
  }

  const keepsLivePublication =
    existingWork.archivedAt === null &&
    existingWork.status === "published" &&
    existingWork.visibility === "public" &&
    existingWork.publishedAt !== null;

  const requestedStatus =
    changes.status === "in_progress"
      ? "in_review"
      : changes.status === "draft"
        ? "draft"
        : undefined;
  const status = keepsLivePublication
    ? undefined
    : requestedStatus;

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
      contentRating: changes.contentRating,
      contentWarnings: serializeWorkContentWarnings(changes.contentWarnings),
      contentRatingConfirmedAt: new Date(),
      status,
      title: changes.title,
      ...(keepsLivePublication
        ? {
            archivedAt: null,
            publishedAt: existingWork.publishedAt,
            status: "published",
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

export async function updateWriterMetadata(
  authorId: string,
  input: WriterMetadataInput,
) {
  const work =
    await worksRepository.getAuthorWorkById(
      authorId,
      input.id,
    );

  if (!work) {
    throw new Error(
      "Eser bulunamadı veya bu eseri düzenleme yetkin yok.",
    );
  }

  return worksRepository.updateWork(
    authorId,
    input.id,
    {
      description: input.summary,
      genre: input.genre,
      title: input.title,
    },
  );
}

export async function saveChapterDraft(
  authorId: string,
  input: ChapterDraftInput,
) {
  const ownedChapter =
    await worksRepository.getAuthorChapterById(
      authorId,
      input.workId,
      input.chapterId,
    );

  if (!ownedChapter) {
    throw new Error(
      "Bölüm bu esere ait değil veya bölümü düzenleme yetkin yok.",
    );
  }

  const keepsLivePublication =
    ownedChapter.status === "published" &&
    ownedChapter.publishedAt !== null;

  return worksRepository.updateChapter(
    authorId,
    input.chapterId,
    {
      archivedAt: null,
      content: input.content,
      publishedAt: keepsLivePublication
        ? ownedChapter.publishedAt
        : null,
      status: keepsLivePublication
        ? "published"
        : "draft",
      title: input.title,
    },
  );
}

export async function publishWork(
  authorId: string,
  input: ChapterDraftInput,
  publicationLayout: PublicationLayoutSnapshot,
) {
  if (!hasMeaningfulText(input.content)) {
    throw new Error(
      "Boş bir bölüm yayımlanamaz. Bölüm metnini yazdıktan sonra tekrar dene.",
    );
  }

  const {
    publicationEvent,
    work: publishedWork,
  } = await publishWorkWithEvent(
    authorId,
    input,
    publicationLayout,
  );

  try {
    await deliverPublicationNotifications({
      authorId,
      chapterId: input.chapterId,
      publicationEvent,
      workId: input.workId,
    });
  } catch (notificationError) {
    console.error(
      "PUBLICATION_POST_COMMIT_NOTIFICATION_FAILED",
      {
        error:
          notificationError instanceof Error
            ? notificationError.message
            : "UNKNOWN_ERROR",
        workId: input.workId,
      },
    );
  }

  return publishedWork;
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
