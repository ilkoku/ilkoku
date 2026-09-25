"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { collectBookIndexListByCode } from "@/lib/book-index/collector";
import { getBookIndexList } from "@/lib/book-index/lists";
import { getCurrentUser } from "@/lib/auth/current-user";

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

  try {
    const result = await collectBookIndexListByCode(listCode);
    revalidatePath("/sistem-yonetimi/kitap-endeksi");
    redirect(
      destination(
        result.status === "no_change" ? "degisiklik-yok" : "toplandi",
        listCode,
        result.items,
      ),
    );
  } catch (error) {
    console.error("BOOK_INDEX_ADMIN_COLLECT_FAILED", {
      listCode,
      error: error instanceof Error ? error.message : "UNKNOWN",
    });
    redirect(destination("toplama-hatasi", listCode));
  }
}
