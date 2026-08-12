"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  claimPublisherEditorRequest,
  completePublisherEditorReview,
  createPublisherEditorRequest,
  savePublisherEditorReviewDraft,
} from "./repository";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type PublisherEditorActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidatePublisherEditorFlow() {
  revalidatePath("/yayinevi/kesfet/eserler");
  revalidatePath("/yayinevi/editor-talepleri");
  revalidatePath("/yayinevi/bildirimler");
  revalidatePath("/editor/yayinevi-talepleri");
  revalidatePath("/editor/bildirimler");
}

export async function createPublisherEditorRequestAction(
  _state: PublisherEditorActionState,
  formData: FormData,
): Promise<PublisherEditorActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      message: "Oturum bilgisi bulunamadı. Yeniden giriş yapın.",
      status: "error",
    };
  }

  const workId = text(formData, "workId");
  const note = text(formData, "note");

  if (!UUID_PATTERN.test(workId)) {
    return {
      message: "Eser bilgisi doğrulanamadı.",
      status: "error",
    };
  }

  try {
    const result = await createPublisherEditorRequest({
      note,
      userId: user.id,
      workId,
    });

    if (result.status === "forbidden") {
      return {
        message: "Yayınevi editör talebi oluşturma yetkiniz bulunmuyor.",
        status: "error",
      };
    }

    if (result.status === "invalid_note") {
      return {
        message: "Talep notu 10–1000 karakter arasında olmalıdır.",
        status: "error",
      };
    }

    if (result.status === "invalid_work") {
      return {
        message:
          "Yalnızca tamamlanmış, herkese açık ve yayımlanmış eserler için editör talebi açılabilir.",
        status: "error",
      };
    }

    if (result.status === "already_active") {
      return {
        message: "Bu eser için yayınevinizin aktif bir editör talebi zaten bulunuyor.",
        status: "error",
      };
    }

    revalidatePublisherEditorFlow();

    return {
      message:
        "Editör talebi oluşturuldu. Talep İlkOku editörlerinin Yayınevi Editör Talepleri havuzuna eklendi.",
      status: "success",
    };
  } catch (error) {
    console.error("PUBLISHER_EDITOR_REQUEST_CREATE_FAILED", error);
    return {
      message: "Editör talebi oluşturulamadı. Lütfen yeniden deneyin.",
      status: "error",
    };
  }
}

async function requireEditor() {
  const user = await getCurrentUser();

  if (!user || user.role !== "editor" || user.status !== "active") {
    return null;
  }

  return user;
}

export async function claimPublisherEditorRequestAction(
  _state: PublisherEditorActionState,
  formData: FormData,
): Promise<PublisherEditorActionState> {
  const editor = await requireEditor();
  if (!editor) {
    return {
      message: "Aktif editör hesabı gerekli.",
      status: "error",
    };
  }

  const requestId = text(formData, "requestId");
  if (!UUID_PATTERN.test(requestId)) {
    return {
      message: "Talep bilgisi doğrulanamadı.",
      status: "error",
    };
  }

  try {
    const result = await claimPublisherEditorRequest({
      editorId: editor.id,
      requestId,
    });

    if (result.status === "already_claimed") {
      return {
        message: "Bu görev başka bir editör tarafından alınmış olabilir.",
        status: "error",
      };
    }

    if (result.status === "forbidden") {
      return {
        message: "Bu görevi alma yetkiniz bulunmuyor.",
        status: "error",
      };
    }

    revalidatePublisherEditorFlow();

    return {
      message: "Yayınevi editör görevi incelemelerinize eklendi.",
      status: "success",
    };
  } catch (error) {
    console.error("PUBLISHER_EDITOR_REQUEST_CLAIM_FAILED", error);
    return {
      message: "Görev alınamadı.",
      status: "error",
    };
  }
}

function reviewInput(formData: FormData) {
  return {
    category: text(formData, "category"),
    content: text(formData, "content"),
    requestId: text(formData, "requestId"),
    title: text(formData, "title"),
  };
}

export async function savePublisherEditorReviewDraftAction(
  _state: PublisherEditorActionState,
  formData: FormData,
): Promise<PublisherEditorActionState> {
  const editor = await requireEditor();
  if (!editor) {
    return { message: "Aktif editör hesabı gerekli.", status: "error" };
  }

  const input = reviewInput(formData);
  if (!UUID_PATTERN.test(input.requestId)) {
    return { message: "Talep bilgisi doğrulanamadı.", status: "error" };
  }

  try {
    const result = await savePublisherEditorReviewDraft({
      ...input,
      editorId: editor.id,
    });

    if (result.status === "invalid_review") {
      return {
        message:
          "Başlık 3–160, kategori 2–60 ve değerlendirme 20–10000 karakter arasında olmalıdır.",
        status: "error",
      };
    }

    if (result.status === "forbidden") {
      return {
        message: "Bu yayınevi editör görevi için inceleme yetkiniz bulunmuyor.",
        status: "error",
      };
    }

    revalidatePath(`/editor/yayinevi-talepleri/${input.requestId}`);

    return {
      message: "Yayınevi editör inceleme taslağı kaydedildi.",
      status: "success",
    };
  } catch (error) {
    console.error("PUBLISHER_EDITOR_REVIEW_SAVE_FAILED", error);
    return { message: "Taslak kaydedilemedi.", status: "error" };
  }
}

export async function completePublisherEditorReviewAction(
  _state: PublisherEditorActionState,
  formData: FormData,
): Promise<PublisherEditorActionState> {
  const editor = await requireEditor();
  if (!editor) {
    return { message: "Aktif editör hesabı gerekli.", status: "error" };
  }

  const input = reviewInput(formData);
  if (!UUID_PATTERN.test(input.requestId)) {
    return { message: "Talep bilgisi doğrulanamadı.", status: "error" };
  }

  try {
    const result = await completePublisherEditorReview({
      ...input,
      editorId: editor.id,
    });

    if (result.status === "invalid_review") {
      return {
        message:
          "Başlık 3–160, kategori 2–60 ve değerlendirme 20–10000 karakter arasında olmalıdır.",
        status: "error",
      };
    }

    if (result.status === "forbidden") {
      return {
        message: "Bu yayınevi editör görevi artık tamamlanabilir durumda değil.",
        status: "error",
      };
    }

    revalidatePublisherEditorFlow();
    revalidatePath(`/editor/yayinevi-talepleri/${input.requestId}`);

    return {
      message:
        "Yayınevi editör incelemesi tamamlandı. Bu görev ileride ücret sistemi devreye alındığında ücret hakkına uygun kayıt olarak saklanacaktır.",
      status: "success",
    };
  } catch (error) {
    console.error("PUBLISHER_EDITOR_REVIEW_COMPLETE_FAILED", error);
    return { message: "İnceleme tamamlanamadı.", status: "error" };
  }
}

export async function submitPublisherEditorReviewAction(
  state: PublisherEditorActionState,
  formData: FormData,
): Promise<PublisherEditorActionState> {
  const intent = text(formData, "intent");

  if (intent === "save") {
    return savePublisherEditorReviewDraftAction(state, formData);
  }

  if (intent === "complete") {
    return completePublisherEditorReviewAction(state, formData);
  }

  return {
    message: "Geçerli bir inceleme işlemi seçin.",
    status: "error",
  };
}
