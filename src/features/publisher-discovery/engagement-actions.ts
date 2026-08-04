"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
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

  revalidatePath(
    pathWithoutQuery(returnPath),
  );
  revalidatePath(
    "/yayinevi/kesfet/yazarlar",
  );

  redirect(returnPath);
}
