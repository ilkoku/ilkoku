"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { collectBookIndexListByCode } from "@/lib/book-index/collector";
import { getBookIndexList } from "@/lib/book-index/lists";
import { matchPendingBookIndexBooks } from "@/lib/book-index/matching";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

function destination(status: string, listCode?: string, items?: number) {
  const params = new URLSearchParams({ durum: status });
  if (listCode) params.set("liste", listCode);
  if (typeof items === "number") params.set("adet", String(items));
  return `/sistem-yonetimi/kitap-endeksi?${params.toString()}`;
}

export async function collectBookIndexListAction(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=system_management_book_index");
  }

  const listCode = String(formData.get("listCode") ?? "").trim();
  const list = getBookIndexList(listCode);
  if (!list || !list.enabled) {
    redirect(destination("liste-bulunamadi"));
  }

  let result: Awaited<ReturnType<typeof collectBookIndexListByCode>>;

  try {
    result = await collectBookIndexListByCode(listCode);
  } catch (error) {
    console.error("BOOK_INDEX_ADMIN_COLLECT_FAILED", {
      listCode,
      error: error instanceof Error ? error.message : "UNKNOWN",
    });
    redirect(destination("toplama-hatasi", listCode));
  }

  revalidatePath("/sistem-yonetimi/kitap-endeksi");
  redirect(
    destination(
      result.status === "no_change" ? "degisiklik-yok" : "toplandi",
      listCode,
      result.items,
    ),
  );
}


export async function matchPendingBookIndexBooksAction() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=system_management_book_index_matching");
  }

  let result: Awaited<ReturnType<typeof matchPendingBookIndexBooks>>;

  try {
    result = await matchPendingBookIndexBooks(200);
  } catch (error) {
    console.error("BOOK_INDEX_ADMIN_MATCH_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN",
    });
    redirect(destination("eslestirme-hatasi"));
  }

  revalidatePath("/sistem-yonetimi/kitap-endeksi");
  const params = new URLSearchParams({
    durum: "eslestirme-tamamlandi",
    adet: String(result.processed),
    eslesen: String(result.matched),
    bekleyen: String(result.pending),
  });
  redirect(`/sistem-yonetimi/kitap-endeksi?${params.toString()}`);
}


async function requireBookIndexAdmin(source: string) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    redirect(`/erisim-reddedildi?kaynak=${source}`);
  }

  return admin;
}

export async function rejectBookIndexExternalBookAction(formData: FormData) {
  await requireBookIndexAdmin("system_management_book_index_reject");

  const externalBookId = String(formData.get("externalBookId") ?? "").trim();
  if (!externalBookId) {
    redirect(destination("kapsam-disi-hatasi"));
  }

  const result = await prisma.bookIndexExternalBook.updateMany({
    where: {
      id: externalBookId,
      matchStatus: "unmatched",
      masterBookId: null,
    },
    data: {
      matchStatus: "rejected",
      matchConfidence: null,
    },
  });

  if (result.count !== 1) {
    redirect(destination("kapsam-disi-hatasi"));
  }

  revalidatePath("/sistem-yonetimi/kitap-endeksi");
  redirect(destination("kapsam-disi-isaretlendi"));
}

export async function restoreBookIndexExternalBookAction(formData: FormData) {
  await requireBookIndexAdmin("system_management_book_index_restore");

  const externalBookId = String(formData.get("externalBookId") ?? "").trim();
  if (!externalBookId) {
    redirect(destination("kapsam-disi-geri-al-hatasi"));
  }

  const result = await prisma.bookIndexExternalBook.updateMany({
    where: {
      id: externalBookId,
      matchStatus: "rejected",
      masterBookId: null,
    },
    data: {
      matchStatus: "unmatched",
      matchConfidence: null,
    },
  });

  if (result.count !== 1) {
    redirect(destination("kapsam-disi-geri-al-hatasi"));
  }

  revalidatePath("/sistem-yonetimi/kitap-endeksi");
  redirect(destination("kapsam-disi-geri-alindi"));
}
