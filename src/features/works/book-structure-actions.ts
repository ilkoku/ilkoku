"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";

import { buildBookSectionTemplate } from "./book-section-templates";
import {
  bookSectionDetails,
  isSpecialBookSectionKind,
  type BookStructureItem,
  type SpecialBookSectionKind,
} from "./book-structure";
import {
  createSpecialBookSection,
  getBookStructure,
  prepareBookForPublication,
  reorderBookStructure,
  saveSpecialBookSection,
} from "./book-structure-repository";
import {
  getBookTemplateContext,
  hasTrashedBookSectionKind,
} from "./book-trash-repository";

type StructureActionResult = {
  status: "success" | "error";
  message: string;
  item?: BookStructureItem;
  items?: BookStructureItem[];
  tocContent?: string;
  tocItemId?: string;
};

const workIdSchema = z.string().uuid();
const itemIdSchema = z.string().uuid();
const reorderSchema = z
  .array(z.string().uuid())
  .min(1)
  .max(500)
  .refine((value) => new Set(value).size === value.length, {
    message: "Kitap sırası aynı öğeyi birden fazla kez içeremez.",
  });

async function authenticatedWriter() {
  const user = await getCurrentUser();

  if (!user || user.role !== "writer") {
    return null;
  }

  return user;
}

function error(message: string): StructureActionResult {
  return {
    status: "error",
    message,
  };
}

function revalidateWriterPaths() {
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
}

export async function loadBookStructureAction(
  workIdValue: string,
): Promise<StructureActionResult> {
  const parsedWorkId = workIdSchema.safeParse(workIdValue);

  if (!parsedWorkId.success) {
    return error("Geçerli bir eser seçilmelidir.");
  }

  const writer = await authenticatedWriter();

  if (!writer) {
    return error("Kitap yapısını görmek için yazar hesabınla giriş yapmalısın.");
  }

  try {
    const items = await getBookStructure(writer.id, parsedWorkId.data);

    return {
      status: "success",
      message: "Kitap yapısı yüklendi.",
      items,
    };
  } catch (caughtError) {
    console.error("LOAD_BOOK_STRUCTURE_ERROR:", caughtError);
    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Kitap yapısı yüklenemedi.",
    );
  }
}

export async function createBookSectionAction(
  workIdValue: string,
  kindValue: string,
): Promise<StructureActionResult> {
  const parsedWorkId = workIdSchema.safeParse(workIdValue);

  if (!parsedWorkId.success) {
    return error("Geçerli bir eser seçilmelidir.");
  }

  if (!isSpecialBookSectionKind(kindValue)) {
    return error("Geçerli bir kitap sayfası seçilmelidir.");
  }

  const writer = await authenticatedWriter();

  if (!writer) {
    return error("Kitap sayfası eklemek için yazar hesabınla giriş yapmalısın.");
  }

  const kind = kindValue as SpecialBookSectionKind;

  try {
    if (await hasTrashedBookSectionKind(writer.id, parsedWorkId.data, kind)) {
      return error(
        `${bookSectionDetails[kind].label} çöp kutusunda. Yeni bir tane eklemek yerine geri yükleyebilir veya çöp kutusunu boşaltabilirsin.`,
      );
    }

    let item = await createSpecialBookSection(
      writer.id,
      parsedWorkId.data,
      kind,
    );

    if (kind !== "toc") {
      const context = await getBookTemplateContext(writer.id, parsedWorkId.data);
      const template = buildBookSectionTemplate(kind, context);

      if (template) {
        item = await saveSpecialBookSection(
          writer.id,
          parsedWorkId.data,
          item.id,
          item.title,
          template,
        );
      }
    }

    revalidateWriterPaths();

    return {
      status: "success",
      message: `${item.title} hazır şablonla eklendi.`,
      item,
    };
  } catch (caughtError) {
    console.error("CREATE_BOOK_SECTION_ERROR:", caughtError);
    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Kitap sayfası eklenemedi.",
    );
  }
}

export async function saveBookSectionAction(input: {
  workId: string;
  itemId: string;
  title: string;
  content: string;
}): Promise<StructureActionResult> {
  const parsedWorkId = workIdSchema.safeParse(input.workId);
  const parsedItemId = itemIdSchema.safeParse(input.itemId);

  if (!parsedWorkId.success || !parsedItemId.success) {
    return error("Geçerli bir kitap sayfası seçilmelidir.");
  }

  const writer = await authenticatedWriter();

  if (!writer) {
    return error("Kitap sayfasını kaydetmek için yeniden giriş yapmalısın.");
  }

  try {
    const item = await saveSpecialBookSection(
      writer.id,
      parsedWorkId.data,
      parsedItemId.data,
      input.title,
      input.content,
    );

    revalidateWriterPaths();

    return {
      status: "success",
      message: "Kitap sayfası kaydedildi.",
      item,
    };
  } catch (caughtError) {
    console.error("SAVE_BOOK_SECTION_ERROR:", caughtError);
    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Kitap sayfası kaydedilemedi.",
    );
  }
}

export async function reorderBookStructureAction(input: {
  workId: string;
  orderedItemIds: string[];
}): Promise<StructureActionResult> {
  const parsedWorkId = workIdSchema.safeParse(input.workId);
  const parsedOrder = reorderSchema.safeParse(input.orderedItemIds);

  if (!parsedWorkId.success || !parsedOrder.success) {
    return error(
      parsedOrder.success
        ? "Geçerli bir eser seçilmelidir."
        : parsedOrder.error.issues[0]?.message ?? "Kitap sırası doğrulanamadı.",
    );
  }

  const writer = await authenticatedWriter();

  if (!writer) {
    return error("Kitap sırasını değiştirmek için yeniden giriş yapmalısın.");
  }

  try {
    const items = await reorderBookStructure(
      writer.id,
      parsedWorkId.data,
      parsedOrder.data,
    );

    revalidateWriterPaths();

    return {
      status: "success",
      message: "Kitap sırası güncellendi.",
      items,
    };
  } catch (caughtError) {
    console.error("REORDER_BOOK_STRUCTURE_ERROR:", caughtError);
    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Kitap sırası güncellenemedi.",
    );
  }
}

export async function prepareBookForPublicationAction(
  workIdValue: string,
): Promise<StructureActionResult> {
  const parsedWorkId = workIdSchema.safeParse(workIdValue);

  if (!parsedWorkId.success) {
    return error("Geçerli bir eser seçilmelidir.");
  }

  const writer = await authenticatedWriter();

  if (!writer) {
    return error("Eseri yayına hazırlamak için yeniden giriş yapmalısın.");
  }

  try {
    const prepared = await prepareBookForPublication(
      writer.id,
      parsedWorkId.data,
    );

    revalidateWriterPaths();

    return {
      status: "success",
      message: "İçindekiler kitap sırasına göre otomatik hazırlandı.",
      items: prepared.items,
      tocContent: prepared.tocContent,
      tocItemId: prepared.tocItemId,
    };
  } catch (caughtError) {
    console.error("PREPARE_BOOK_PUBLICATION_ERROR:", caughtError);
    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "İçindekiler hazırlanamadı.",
    );
  }
}
