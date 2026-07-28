"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { EditorActionState } from "./types";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function requireActiveEditor() {
  const user = await getCurrentUser();

  if (!user || user.role !== "editor" || user.status !== "active") {
    throw new Error("EDITOR_PERMISSION_REQUIRED");
  }

  return user;
}

function refreshEditorFlow(workSlug?: string) {
  revalidatePath("/editor/incelemeler");
  revalidatePath("/editor/kesfet");
  revalidatePath("/editor/onerilenler");
  revalidatePath("/editor/bildirimler");
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");

  if (workSlug) {
    revalidatePath(`/kitap/${workSlug}`);
    revalidatePath(`/oku/${workSlug}`);
  }
}

/**
 * Birinci editör incelemesi tamamlandıktan sonra ikinci editör görevini açar.
 * mode=pool: genel editör havuzuna bırakır.
 * mode=specific: belirli bir platform editörüne atar.
 */
export async function sendToSecondEditorAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const sender = await requireActiveEditor();
    const workId = value(formData, "workId");
    const mode = value(formData, "mode");
    const editorId = value(formData, "editorId");

    if (!workId || !["pool", "specific"].includes(mode)) {
      return { status: "error", message: "İkinci editör seçimi geçersiz." };
    }

    const work = await prisma.work.findFirst({
      where: {
        id: workId,
        assignedEditorId: sender.id,
        editorReviewStatus: "awaiting_second_editor",
      },
      select: { id: true, slug: true, title: true },
    });

    if (!work) {
      return {
        status: "error",
        message: "Bu eser ikinci editöre gönderilmeye hazır değil.",
      };
    }

    let targetEditor: { id: string; fullName: string } | null = null;

    if (mode === "specific") {
      if (!editorId || editorId === sender.id) {
        return {
          status: "error",
          message: "Birinci editörden farklı bir editör seçin.",
        };
      }

      targetEditor = await prisma.user.findFirst({
        where: { id: editorId, role: "editor", status: "active" },
        select: { id: true, fullName: true },
      });

      if (!targetEditor) {
        return { status: "error", message: "Seçilen editör aktif değil." };
      }
    }

    const now = new Date();

    await prisma.$transaction(async (transaction) => {
      await transaction.editorReviewAssignment.upsert({
        where: { workId_stage: { workId: work.id, stage: "second" } },
        create: {
          workId: work.id,
          stage: "second",
          source: mode === "pool" ? "pool" : "specific_editor",
          status: targetEditor ? "assigned" : "waiting",
          editorId: targetEditor?.id,
          assignedAt: targetEditor ? now : null,
        },
        update: {
          source: mode === "pool" ? "pool" : "specific_editor",
          status: targetEditor ? "assigned" : "waiting",
          editorId: targetEditor?.id ?? null,
          assignedAt: targetEditor ? now : null,
          invitedEmail: null,
        },
      });

      await transaction.work.update({
        where: { id: work.id },
        data: {
          editorReviewStatus: targetEditor
            ? "second_in_progress"
            : "awaiting_second_editor",
        },
      });

      if (targetEditor) {
        await transaction.notification.create({
          data: {
            userId: targetEditor.id,
            type: "editor_recommendation",
            title: "İkinci editör görevi",
            message: `${work.title} adlı eser ikinci editör incelemesi için size atandı.`,
            relatedEntityType: "work",
            relatedEntityId: work.id,
          },
        });
      }
    });

    refreshEditorFlow(work.slug);

    return {
      status: "success",
      message: targetEditor
        ? `Eser ${targetEditor.fullName} adlı editöre gönderildi.`
        : "Eser ikinci editör genel havuzuna bırakıldı.",
    };
  } catch {
    return { status: "error", message: "İkinci editör görevi oluşturulamadı." };
  }
}

/** Genel havuzdaki ikinci editör görevini yarış durumuna güvenli biçimde alır. */
export async function claimSecondEditorReviewAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const editor = await requireActiveEditor();
    const workId = value(formData, "workId");
    const now = new Date();

    const assignment = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.editorReviewAssignment.updateMany({
        where: {
          workId,
          stage: "second",
          source: "pool",
          status: "waiting",
          editorId: null,
          work: { assignedEditorId: { not: editor.id } },
        },
        data: {
          editorId: editor.id,
          status: "in_progress",
          assignedAt: now,
          startedAt: now,
        },
      });

      if (updated.count !== 1) return null;

      await transaction.work.update({
        where: { id: workId },
        data: { editorReviewStatus: "second_in_progress" },
      });

      return transaction.editorReviewAssignment.findUnique({
        where: { workId_stage: { workId, stage: "second" } },
        select: { work: { select: { slug: true } } },
      });
    });

    if (!assignment) {
      return {
        status: "error",
        message: "Bu görev başka bir editör tarafından alınmış olabilir.",
      };
    }

    refreshEditorFlow(assignment.work.slug);
    return { status: "success", message: "İkinci editör görevi panelinize eklendi." };
  } catch {
    return { status: "error", message: "Görev alınamadı." };
  }
}
