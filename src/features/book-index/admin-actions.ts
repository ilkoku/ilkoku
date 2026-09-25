"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { collectBookIndexListByCode } from "@/lib/book-index/collector";
import { getBookIndexList } from "@/lib/book-index/lists";
import { matchPendingBookIndexBooks } from "@/lib/book-index/matching";
import { runBookIndexScheduler } from "@/lib/book-index/scheduler";
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


export async function runBookIndexSchedulerCanaryAction() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=system_management_book_index_scheduler");
  }

  let result: Awaited<ReturnType<typeof runBookIndexScheduler>>;

  try {
    result = await runBookIndexScheduler();
  } catch (error) {
    console.error("BOOK_INDEX_ADMIN_SCHEDULER_CANARY_FAILED", {
      error: error instanceof Error ? error.message : "UNKNOWN",
    });
    redirect(destination("scheduler-canary-hatasi"));
  }

  revalidatePath("/sistem-yonetimi/kitap-endeksi");
  const params = new URLSearchParams({
    durum: result.failed > 0
      ? "scheduler-canary-kismi"
      : "scheduler-canary-tamamlandi",
    kontrol: String(result.checked),
    due: String(result.due),
    basarili: String(result.succeeded),
    degismedi: String(result.unchanged),
    hata: String(result.failed),
    atlandi: String(result.skipped),
    adet: String(result.itemsStored),
  });
  redirect(`/sistem-yonetimi/kitap-endeksi?${params.toString()}`);
}
