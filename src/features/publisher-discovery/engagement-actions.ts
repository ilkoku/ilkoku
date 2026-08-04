"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  sendAuthorPublisherInterestEmail,
} from "@/lib/email/publisher-engagement-emails";
import { prisma } from "@/lib/prisma";
import {
  setPublisherAuthorFollowV2,
  setPublisherWorkLikeV2,
} from "./engagement-repository";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function safeReturnPath(
  value: FormDataEntryValue | null,
  allowedPaths: readonly string[],
  fallbackPath: string,
) {
  const raw = String(value ?? "").trim();

  if (
    !raw.startsWith("/") ||
    raw.startsWith("//")
  ) {
    return fallbackPath;
  }

  const url = new URL(raw, "http://ilkoku.local");

  if (!allowedPaths.includes(url.pathname)) {
    return fallbackPath;
  }

  return `${url.pathname}${url.search}`;
}

function pathWithoutQuery(path: string) {
  return new URL(
    path,
    "http://ilkoku.local",
  ).pathname;
}

function logInterestFailure(
  event: string,
  entityId: string,
  error: unknown,
) {
  console.error(
    "PUBLISHER_INTEREST_NOTIFICATION_FAILED",
    {
      entityId,
      event,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    },
  );
}

async function notifyAuthorWorkLiked(
  workId: string,
) {
  try {
    const work = await prisma.work.findUnique({
      where: {
        id: workId,
      },
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
          `${work.title} adlı eseriniz bir yayınevi tarafından beğenildi. Yayınevi kimliği bu aşamada anonim tutulur.`,
        relatedEntityId: work.id,
        relatedEntityType: "work",
        title: "Bir yayınevi eserinizi beğendi",
        type: "system",
        userId: work.author.id,
      },
    });

    if (work.author.emailVerified) {
      await sendAuthorPublisherInterestEmail({
        email: work.author.email,
        fullName: work.author.fullName,
        kind: "work_liked",
        workSlug: work.slug,
        workTitle: work.title,
      });
    }
  } catch (error) {
    logInterestFailure(
      "publisher_work_liked",
      workId,
      error,
    );
  }
}

async function notifyAuthorFollowed(
  authorId: string,
) {
  try {
    const author = await prisma.user.findUnique({
      where: {
        id: authorId,
      },
      select: {
        email: true,
        emailVerified: true,
        fullName: true,
        id: true,
      },
    });

    if (!author) return;

    await prisma.notification.create({
      data: {
        message:
          "Bir yayınevi yazar profilinizi takip etmeye başladı. Yayınevi kimliği bu aşamada anonim tutulur.",
        relatedEntityId: author.id,
        relatedEntityType: "user",
        title:
          "Bir yayınevi sizi takip etmeye başladı",
        type: "system",
        userId: author.id,
      },
    });

    if (author.emailVerified) {
      await sendAuthorPublisherInterestEmail({
        email: author.email,
        fullName: author.fullName,
        kind: "author_followed",
      });
    }
  } catch (error) {
    logInterestFailure(
      "publisher_author_followed",
      authorId,
      error,
    );
  }
}

export async function togglePublisherWorkLikeAction(
  formData: FormData,
): Promise<void> {
  const returnPath = safeReturnPath(
    formData.get("returnPath"),
    [
      "/yayinevi/kesfet/eserler",
      "/yayinevi/favorilerim",
    ],
    "/yayinevi/kesfet/eserler",
  );
  const workId = String(
    formData.get("workId") ?? "",
  ).trim();
  const active =
    String(formData.get("active") ?? "") ===
    "true";

  if (!UUID_PATTERN.test(workId)) {
    throw new Error(
      "Geçerli bir eser seçilemedi.",
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(
      `/giris?sonraki=${encodeURIComponent(returnPath)}`,
    );
  }

  const result = await setPublisherWorkLikeV2({
    active,
    userId: user.id,
    workId,
  });

  if (result.status === "forbidden") {
    redirect(
      "/erisim-reddedildi?gerekli=like_work",
    );
  }

  if (result.status === "not_found") {
    throw new Error(
      "Beğenilecek public eser bulunamadı.",
    );
  }

  if (
    result.status === "ok" &&
    result.active &&
    result.changed
  ) {
    await notifyAuthorWorkLiked(workId);
  }

  revalidatePath(
    pathWithoutQuery(returnPath),
  );
  revalidatePath(
    "/yayinevi/kesfet/eserler",
  );
  revalidatePath(
    "/yayinevi/favorilerim",
  );

  if (
    result.status === "ok" &&
    result.slug
  ) {
    revalidatePath(`/kitap/${result.slug}`);
  }

  redirect(returnPath);
}

export async function togglePublisherAuthorFollowAction(
  formData: FormData,
): Promise<void> {
  const returnPath = safeReturnPath(
    formData.get("returnPath"),
    [
      "/yayinevi/kesfet/yazarlar",
      "/yayinevi/takip-ettiklerim",
    ],
    "/yayinevi/kesfet/yazarlar",
  );
  const authorId = String(
    formData.get("authorId") ?? "",
  ).trim();
  const active =
    String(formData.get("active") ?? "") ===
    "true";

  if (!UUID_PATTERN.test(authorId)) {
    throw new Error(
      "Geçerli bir yazar seçilemedi.",
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(
      `/giris?sonraki=${encodeURIComponent(returnPath)}`,
    );
  }

  const result =
    await setPublisherAuthorFollowV2({
      active,
      authorId,
      userId: user.id,
    });

  if (result.status === "forbidden") {
    redirect(
      "/erisim-reddedildi?gerekli=follow_author",
    );
  }

  if (result.status === "not_found") {
    throw new Error(
      "Takip edilecek public yazar bulunamadı.",
    );
  }

  if (
    result.status === "ok" &&
    result.active &&
    result.changed
  ) {
    await notifyAuthorFollowed(authorId);
  }

  revalidatePath(
    pathWithoutQuery(returnPath),
  );
  revalidatePath(
    "/yayinevi/kesfet/yazarlar",
  );

  redirect(returnPath);
}
