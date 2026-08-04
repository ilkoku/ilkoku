"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  sendAuthorPublisherInterestEmail,
  type AuthorPublisherInterestKind,
} from "@/lib/email/publisher-engagement-emails";
import { prisma } from "@/lib/prisma";
import {
  setPublisherAuthorFavorite,
  setPublisherAuthorLike,
  setPublisherWorkFavorite,
} from "./engagement-extended-repository";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const allowedReturnPaths = [
  "/yayinevi/kesfet/eserler",
  "/yayinevi/kesfet/yazarlar",
  "/yayinevi/favorilerim",
  "/yayinevi/begenilerim",
  "/yayinevi/takip-ettiklerim",
  "/yayinevi/paylasilanlar",
] as const;

function safeReturnPath(
  value: FormDataEntryValue | null,
  fallbackPath: string,
) {
  const raw = String(value ?? "").trim();

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return fallbackPath;
  }

  const url = new URL(raw, "http://ilkoku.local");

  if (!allowedReturnPaths.includes(
    url.pathname as (typeof allowedReturnPaths)[number],
  )) {
    return fallbackPath;
  }

  return `${url.pathname}${url.search}`;
}

function pathWithoutQuery(path: string) {
  return new URL(path, "http://ilkoku.local").pathname;
}

function logInterestFailure(
  event: string,
  entityId: string,
  error: unknown,
) {
  console.error("PUBLISHER_INTEREST_NOTIFICATION_FAILED", {
    entityId,
    event,
    error:
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR",
  });
}

async function notifyWorkInterest(
  workId: string,
  kind: Extract<
    AuthorPublisherInterestKind,
    "work_favorited"
  >,
) {
  try {
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: {
        author: {
          select: {
            email: true,
            emailVerified: true,
            fullName: true,
            id: true,
          },
        },
        id: true,
        slug: true,
        title: true,
      },
    });

    if (!work) return;

    await prisma.notification.create({
      data: {
        message:
          `${work.title} adlı eseriniz bir yayınevi tarafından kurumsal favorilere eklendi. Yayınevi kimliği bu aşamada anonim tutulur.`,
        relatedEntityId: work.id,
        relatedEntityType: "work",
        title: "Bir yayınevi eserinizi favoriledi",
        type: "system",
        userId: work.author.id,
      },
    });

    if (work.author.emailVerified) {
      await sendAuthorPublisherInterestEmail({
        email: work.author.email,
        fullName: work.author.fullName,
        kind,
        workSlug: work.slug,
        workTitle: work.title,
      });
    }
  } catch (error) {
    logInterestFailure(kind, workId, error);
  }
}

async function notifyAuthorInterest(
  authorId: string,
  kind: Extract<
    AuthorPublisherInterestKind,
    "author_favorited" | "author_liked"
  >,
) {
  try {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: {
        email: true,
        emailVerified: true,
        fullName: true,
        id: true,
      },
    });

    if (!author) return;

    const state =
      kind === "author_liked"
        ? {
            message:
              "Bir yayınevi yazar profilinizi beğendi. Yayınevi kimliği bu aşamada anonim tutulur.",
            title:
              "Bir yayınevi profilinizi beğendi",
          }
        : {
            message:
              "Bir yayınevi yazar profilinizi kurumsal favorilerine ekledi. Yayınevi kimliği bu aşamada anonim tutulur.",
            title:
              "Bir yayınevi profilinizi favoriledi",
          };

    await prisma.notification.create({
      data: {
        message: state.message,
        relatedEntityId: author.id,
        relatedEntityType: "user",
        title: state.title,
        type: "system",
        userId: author.id,
      },
    });

    if (author.emailVerified) {
      await sendAuthorPublisherInterestEmail({
        email: author.email,
        fullName: author.fullName,
        kind,
      });
    }
  } catch (error) {
    logInterestFailure(kind, authorId, error);
  }
}

export async function togglePublisherWorkFavoriteAction(
  formData: FormData,
): Promise<void> {
  const returnPath = safeReturnPath(
    formData.get("returnPath"),
    "/yayinevi/kesfet/eserler",
  );
  const workId = String(formData.get("workId") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";

  if (!UUID_PATTERN.test(workId)) {
    throw new Error("Geçerli bir eser seçilemedi.");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(returnPath)}`);
  }

  const result = await setPublisherWorkFavorite({
    active,
    userId: user.id,
    workId,
  });

  if (result.status === "forbidden") {
    redirect("/erisim-reddedildi?gerekli=favorite_work");
  }

  if (result.status === "not_found") {
    throw new Error("Favoriye alınacak public eser bulunamadı.");
  }

  if (
    result.status === "ok" &&
    result.active &&
    result.changed
  ) {
    await notifyWorkInterest(workId, "work_favorited");
  }

  revalidatePath(pathWithoutQuery(returnPath));
  revalidatePath("/yayinevi/kesfet/eserler");
  revalidatePath("/yayinevi/favorilerim");
  redirect(returnPath);
}

export async function togglePublisherAuthorLikeAction(
  formData: FormData,
): Promise<void> {
  const returnPath = safeReturnPath(
    formData.get("returnPath"),
    "/yayinevi/kesfet/yazarlar",
  );
  const authorId = String(formData.get("authorId") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";

  if (!UUID_PATTERN.test(authorId)) {
    throw new Error("Geçerli bir yazar seçilemedi.");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(returnPath)}`);
  }

  const result = await setPublisherAuthorLike({
    active,
    authorId,
    userId: user.id,
  });

  if (result.status === "forbidden") {
    redirect("/erisim-reddedildi?gerekli=like_author");
  }

  if (result.status === "not_found") {
    throw new Error("Beğenilecek public yazar bulunamadı.");
  }

  if (
    result.status === "ok" &&
    result.active &&
    result.changed
  ) {
    await notifyAuthorInterest(authorId, "author_liked");
  }

  revalidatePath(pathWithoutQuery(returnPath));
  revalidatePath("/yayinevi/kesfet/yazarlar");
  revalidatePath("/yayinevi/begenilerim");
  redirect(returnPath);
}

export async function togglePublisherAuthorFavoriteAction(
  formData: FormData,
): Promise<void> {
  const returnPath = safeReturnPath(
    formData.get("returnPath"),
    "/yayinevi/kesfet/yazarlar",
  );
  const authorId = String(formData.get("authorId") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";

  if (!UUID_PATTERN.test(authorId)) {
    throw new Error("Geçerli bir yazar seçilemedi.");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(returnPath)}`);
  }

  const result = await setPublisherAuthorFavorite({
    active,
    authorId,
    userId: user.id,
  });

  if (result.status === "forbidden") {
    redirect("/erisim-reddedildi?gerekli=favorite_author");
  }

  if (result.status === "not_found") {
    throw new Error("Favoriye alınacak public yazar bulunamadı.");
  }

  if (
    result.status === "ok" &&
    result.active &&
    result.changed
  ) {
    await notifyAuthorInterest(authorId, "author_favorited");
  }

  revalidatePath(pathWithoutQuery(returnPath));
  revalidatePath("/yayinevi/kesfet/yazarlar");
  revalidatePath("/yayinevi/favorilerim");
  redirect(returnPath);
}
