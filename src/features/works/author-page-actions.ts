"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";

import {
  createBookSectionAction,
  saveBookSectionAction,
} from "./book-structure-actions";
import { worksRepository } from "./repository";
import { writerMetadataSchema, workIdSchema } from "./validators";

async function authenticatedWriter() {
  const user = await getCurrentUser();

  if (!user || user.role !== "writer") {
    throw new Error("Bu işlem için yazar hesabınla giriş yapmalısın.");
  }

  return user;
}

function revalidateWorkManagement(slug: string) {
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
  revalidatePath(`/kitap/${slug}`);
  revalidatePath(`/kitap/${slug}/duzenle`);
  revalidatePath("/kesfet");
  revalidatePath("/eserler");
  revalidatePath("/okuyucu");
  revalidatePath("/yazarlar");
}

export async function updateAuthorWorkBasicsAction(formData: FormData) {
  const writer = await authenticatedWriter();
  const parsed = writerMetadataSchema.safeParse({
    id: formData.get("workId"),
    title: formData.get("title"),
    genre: formData.get("genre"),
    summary: formData.get("summary"),
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Eser bilgileri doğrulanamadı.",
    );
  }

  const languageValue = String(formData.get("language") ?? "tr").trim();
  const language = languageValue === "en" ? "en" : "tr";

  const updated = await worksRepository.updateWork(writer.id, parsed.data.id, {
    description: parsed.data.summary ?? null,
    genre: parsed.data.genre ?? null,
    language,
    title: parsed.data.title,
  });

  revalidateWorkManagement(updated.slug);
}

export async function setAuthorWorkActiveAction(formData: FormData) {
  const writer = await authenticatedWriter();
  const parsed = workIdSchema.safeParse({
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    throw new Error("Geçerli bir eser seçilmelidir.");
  }

  const updated = await worksRepository.updateWork(writer.id, parsed.data.workId, {
    isActive: formData.get("nextActive") === "true",
  });

  revalidateWorkManagement(updated.slug);
}

export async function addAuthorBookSectionAction(formData: FormData) {
  await authenticatedWriter();

  const workId = String(formData.get("workId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const result = await createBookSectionAction(workId, kind);

  if (result.status === "error") {
    throw new Error(result.message);
  }

  if (slug) {
    revalidateWorkManagement(slug);
  }
}

export async function saveAuthorBookSectionAction(formData: FormData) {
  await authenticatedWriter();

  const slug = String(formData.get("slug") ?? "");
  const result = await saveBookSectionAction({
    workId: String(formData.get("workId") ?? ""),
    itemId: String(formData.get("itemId") ?? ""),
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
  });

  if (result.status === "error") {
    throw new Error(result.message);
  }

  if (slug) {
    revalidateWorkManagement(slug);
  }
}
