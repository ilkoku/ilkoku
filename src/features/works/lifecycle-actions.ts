"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  initialWorkActionState,
  type WorkActionState,
} from "./types";
import {
  permanentlyDeleteWork,
  restoreTrashedWork,
  setWorkActive,
  trashWork,
} from "./work-lifecycle";
import { workIdSchema } from "./validators";

function error(message: string): WorkActionState {
  return {
    ...initialWorkActionState,
    message,
    status: "error",
  };
}

async function authorId() {
  const user = await getCurrentUser();
  return user?.role === "writer" ? user.id : null;
}

function revalidate(workId?: string) {
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
  revalidatePath("/kesfet");
  revalidatePath("/okuyucu");
  if (workId) revalidatePath(`/eserlerim/${workId}/pasaport`);
}

function parsedWorkId(formData: FormData) {
  return workIdSchema.safeParse({ workId: formData.get("workId") });
}

export async function setWorkActiveAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = parsedWorkId(formData);
  if (!parsed.success) return error("Geçerli bir eser seçilmelidir.");

  const active = String(formData.get("active")) === "true";
  const id = await authorId();
  if (!id) return error("Bu işlem için yazar hesabınla giriş yapmalısın.");

  try {
    await setWorkActive(id, parsed.data.workId, active);
    revalidate(parsed.data.workId);
    return {
      message: active ? "Eser aktif edildi." : "Eser pasife alındı ve dış görünürlükten kaldırıldı.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch (caughtError) {
    return error(caughtError instanceof Error ? caughtError.message : "Durum değiştirilemedi.");
  }
}

export async function trashWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = parsedWorkId(formData);
  if (!parsed.success) return error("Geçerli bir eser seçilmelidir.");

  const id = await authorId();
  if (!id) return error("Bu işlem için yazar hesabınla giriş yapmalısın.");

  try {
    await trashWork(id, parsed.data.workId);
    revalidate(parsed.data.workId);
    return {
      message: "Eser çöp kutusuna taşındı. İstersen geri yükleyebilirsin.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch (caughtError) {
    return error(caughtError instanceof Error ? caughtError.message : "Eser çöp kutusuna taşınamadı.");
  }
}

export async function restoreTrashedWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = parsedWorkId(formData);
  if (!parsed.success) return error("Geçerli bir eser seçilmelidir.");

  const id = await authorId();
  if (!id) return error("Bu işlem için yazar hesabınla giriş yapmalısın.");

  try {
    await restoreTrashedWork(id, parsed.data.workId);
    revalidate(parsed.data.workId);
    return {
      message: "Eser çöp kutusundan geri yüklendi.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch (caughtError) {
    return error(caughtError instanceof Error ? caughtError.message : "Eser geri yüklenemedi.");
  }
}

export async function permanentlyDeleteWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = parsedWorkId(formData);
  if (!parsed.success) return error("Geçerli bir eser seçilmelidir.");
  if (String(formData.get("confirmation") ?? "").trim() !== "SİL") {
    return error("Kalıcı silme için SİL yazarak onay vermelisin.");
  }

  const id = await authorId();
  if (!id) return error("Bu işlem için yazar hesabınla giriş yapmalısın.");

  try {
    await permanentlyDeleteWork(id, parsed.data.workId);
    revalidate();
    return {
      message: "Eser kalıcı olarak silindi.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch (caughtError) {
    return error(caughtError instanceof Error ? caughtError.message : "Eser kalıcı olarak silinemedi.");
  }
}
