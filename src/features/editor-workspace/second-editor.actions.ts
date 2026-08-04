"use server";

import {
  sendAuthorEditorStatusEmail,
  sendSecondEditorAssignmentEmail,
} from "@/lib/email/editor-emails";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { EditorActionState } from "./types";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function secondReviewValues(formData: FormData) {
  const title = value(formData, "title");
  const content = value(formData, "content");
  const category = value(formData, "category") || "genel";
  const priority =
    formData.get("priority") === "important"
      ? ("important" as const)
      : ("normal" as const);

  if (title.length < 3 || title.length > 160) {
    throw new Error("INVALID_REVIEW_TITLE");
  }

  if (content.length < 20 || content.length > 10000) {
    throw new Error("INVALID_REVIEW_CONTENT");
  }

  if (category.length < 2 || category.length > 60) {
    throw new Error("INVALID_REVIEW_CATEGORY");
  }

  return {
    category,
    content,
    priority,
    title,
  };
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
        editorReviewAssignments: {
          some: {
            editorId: sender.id,
            stage: "first",
            status: "completed",
          },
        },
        editorReviewStatus: "awaiting_second_editor",
      },
      select: {
        authorId: true,
        id: true,
        slug: true,
        title: true,
      },
    });

    if (!work) {
      return {
        status: "error",
        message: "Bu eser ikinci editöre gönderilmeye hazır değil.",
      };
    }

    let targetEditor: {
      email: string;
      fullName: string;
      id: string;
    } | null = null;

    if (mode === "specific") {
      if (
        !editorId ||
        editorId === sender.id ||
        editorId === work.authorId
      ) {
        return {
          status: "error",
          message:
            "Birinci editörden ve eser yazarından farklı bir editör seçin.",
        };
      }

      targetEditor = await prisma.user.findFirst({
        where: { id: editorId, role: "editor", status: "active" },
        select: {
          email: true,
          fullName: true,
          id: true,
        },
      });

      if (!targetEditor) {
        return { status: "error", message: "Seçilen editör aktif değil." };
      }
    }

    const now = new Date();

    await prisma.$transaction(async (transaction) => {
      const existingAssignment =
        await transaction.editorReviewAssignment.findUnique({
          where: {
            workId_stage: {
              workId: work.id,
              stage: "second",
            },
          },
          select: {
            editorId: true,
            id: true,
            source: true,
            status: true,
          },
        });

      let shouldNotifyTarget = false;

      if (!existingAssignment) {
        await transaction.editorReviewAssignment.create({
          data: {
            assignedAt: targetEditor ? now : null,
            completedAt: null,
            editorId: targetEditor?.id ?? null,
            invitedEmail: null,
            source:
              mode === "pool"
                ? "pool"
                : "specific_editor",
            stage: "second",
            startedAt: null,
            status: targetEditor
              ? "assigned"
              : "waiting",
            workId: work.id,
          },
        });

        shouldNotifyTarget = Boolean(targetEditor);
      } else if (
        existingAssignment.source === "pool" &&
        existingAssignment.status === "waiting" &&
        existingAssignment.editorId === null
      ) {
        if (targetEditor) {
          const reassigned =
            await transaction.editorReviewAssignment.updateMany({
              where: {
                editorId: null,
                id: existingAssignment.id,
                source: "pool",
                status: "waiting",
              },
              data: {
                assignedAt: now,
                completedAt: null,
                editorId: targetEditor.id,
                invitedEmail: null,
                source: "specific_editor",
                startedAt: null,
                status: "assigned",
              },
            });

          if (reassigned.count !== 1) {
            throw new Error(
              "SECOND_REVIEW_ASSIGNMENT_CHANGED",
            );
          }

          shouldNotifyTarget = true;
        }
      } else {
        throw new Error(
          "SECOND_REVIEW_ALREADY_ASSIGNED",
        );
      }

      const workUpdated =
        await transaction.work.updateMany({
          where: {
            assignedEditorId: sender.id,
            editorReviewAssignments: {
              some: {
                editorId: sender.id,
                stage: "first",
                status: "completed",
              },
            },
            editorReviewStatus:
              "awaiting_second_editor",
            id: work.id,
          },
          data: {
            editorReviewStatus: targetEditor
              ? "second_in_progress"
              : "awaiting_second_editor",
          },
        });

      if (workUpdated.count !== 1) {
        throw new Error(
          "SECOND_REVIEW_WORK_STATE_CHANGED",
        );
      }

      if (targetEditor && shouldNotifyTarget) {
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

    if (targetEditor) {
      try {
        await sendSecondEditorAssignmentEmail({
          editorName: targetEditor.fullName,
          email: targetEditor.email,
          workId: work.id,
          workTitle: work.title,
        });
      } catch (emailError) {
        console.error(
          "EDITOR_EMAIL_DELIVERY_FAILED",
          {
            event: "second_editor_assigned",
            workId: work.id,
            error:
              emailError instanceof Error
                ? emailError.message
                : "UNKNOWN_ERROR",
          },
        );
      }
    }

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

    if (!workId) {
      return {
        status: "error",
        message: "Eser bilgisi bulunamadı.",
      };
    }

    const now = new Date();

    const assignment = await prisma.$transaction(
      async (transaction) => {
        /*
         * Prisma MariaDB adapter, updateMany içindeki ilişkisel
         * filtreleri hatalı SQL'e çevirebildiği için ilişkisel
         * koşullar önce ayrı sorgularla doğrulanır.
         */
        const [
          work,
          firstAssignment,
          secondAssignment,
        ] = await Promise.all([
          transaction.work.findUnique({
            where: {
              id: workId,
            },
            select: {
              assignedEditorId: true,
              authorId: true,
              editorReviewStatus: true,
              slug: true,
            },
          }),
          transaction.editorReviewAssignment.findUnique({
            where: {
              workId_stage: {
                workId,
                stage: "first",
              },
            },
            select: {
              status: true,
            },
          }),
          transaction.editorReviewAssignment.findUnique({
            where: {
              workId_stage: {
                workId,
                stage: "second",
              },
            },
            select: {
              editorId: true,
              id: true,
              source: true,
              status: true,
            },
          }),
        ]);

        const canClaim =
          Boolean(work) &&
          work?.editorReviewStatus ===
            "awaiting_second_editor" &&
          work.assignedEditorId !== editor.id &&
          work.authorId !== editor.id &&
          firstAssignment?.status === "completed" &&
          secondAssignment?.editorId === null &&
          secondAssignment?.source === "pool" &&
          secondAssignment?.status === "waiting";

        if (
          !canClaim ||
          !work ||
          !secondAssignment
        ) {
          return null;
        }

        const updated =
          await transaction.editorReviewAssignment.updateMany({
            where: {
              editorId: null,
              id: secondAssignment.id,
              source: "pool",
              stage: "second",
              status: "waiting",
              workId,
            },
            data: {
              assignedAt: now,
              editorId: editor.id,
              startedAt: now,
              status: "in_progress",
            },
          });

        if (updated.count !== 1) {
          return null;
        }

        const workUpdated =
          await transaction.work.updateMany({
            where: {
              assignedEditorId: {
                not: editor.id,
              },
              authorId: {
                not: editor.id,
              },
              editorReviewStatus:
                "awaiting_second_editor",
              id: workId,
            },
            data: {
              editorReviewStatus:
                "second_in_progress",
            },
          });

        if (workUpdated.count !== 1) {
          throw new Error(
            "SECOND_REVIEW_WORK_STATE_CHANGED",
          );
        }

        return {
          slug: work.slug,
        };
      },
    );

    if (!assignment) {
      return {
        status: "error",
        message:
          "Bu görev başka bir editör tarafından alınmış olabilir.",
      };
    }

    refreshEditorFlow(assignment.slug);

    return {
      status: "success",
      message:
        "İkinci editör görevi panelinize eklendi.",
    };
  } catch (error) {
    console.error(
      "[claimSecondEditorReviewAction]",
      error,
    );

    return {
      status: "error",
      message: "Görev alınamadı.",
    };
  }
}

export async function saveSecondEditorReviewDraftAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const editor = await requireActiveEditor();
    const workId = value(formData, "workId");
    const values = secondReviewValues(formData);

    const assignment =
      await prisma.editorReviewAssignment.findFirst({
        where: {
          editorId: editor.id,
          stage: "second",
          status: {
            in: ["assigned", "in_progress"],
          },
          work: {
            assignedEditorId: {
              not: editor.id,
            },
            editorReviewAssignments: {
              some: {
                stage: "first",
                status: "completed",
              },
            },
            editorReviewStatus: "second_in_progress",
            id: workId,
          },
        },
        select: {
          id: true,
          status: true,
          work: {
            select: {
              authorId: true,
              id: true,
              slug: true,
            },
          },
        },
      });

    if (!assignment) {
      return {
        status: "error",
        message: "Bu eser için aktif bir ikinci editör göreviniz bulunmuyor.",
      };
    }

    const now = new Date();

    await prisma.$transaction(async (transaction) => {
      if (assignment.status === "assigned") {
        const started =
          await transaction.editorReviewAssignment.updateMany({
            where: {
              editorId: editor.id,
              id: assignment.id,
              stage: "second",
              status: "assigned",
            },
            data: {
              startedAt: now,
              status: "in_progress",
            },
          });

        if (started.count !== 1) {
          throw new Error("SECOND_REVIEW_STATE_CHANGED");
        }
      }

      const existing =
        await transaction.editorFeedback.findFirst({
          where: {
            editorId: editor.id,
            isProfessionalReview: true,
            workId: assignment.work.id,
            OR: [
              {
                assignmentId: assignment.id,
              },
              {
                assignmentId: null,
              },
            ],
          },
          select: {
            id: true,
          },
        });

      if (existing) {
        await transaction.editorFeedback.update({
          where: {
            id: existing.id,
          },
          data: {
            ...values,
            assignmentId: assignment.id,
            reportStatus: "draft",
          },
        });
      } else {
        await transaction.editorFeedback.create({
          data: {
            ...values,
            assignmentId: assignment.id,
            authorId: assignment.work.authorId,
            editorId: editor.id,
            isProfessionalReview: true,
            reportStatus: "draft",
            workId: assignment.work.id,
          },
        });
      }
    });

    refreshEditorFlow(assignment.work.slug);

    return {
      status: "success",
      message: "İkinci editör inceleme taslağı kaydedildi.",
    };
  } catch {
    return {
      status: "error",
      message: "İkinci editör inceleme taslağı kaydedilemedi.",
    };
  }
}


export async function completeSecondEditorReviewAction(
  _state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  try {
    const editor = await requireActiveEditor();
    const workId = value(formData, "workId");
    const values = secondReviewValues(formData);
    const completedAt = new Date();

    const assignment =
      await prisma.editorReviewAssignment.findFirst({
        where: {
          editorId: editor.id,
          stage: "second",
          status: {
            in: ["assigned", "in_progress"],
          },
          work: {
            assignedEditorId: {
              not: editor.id,
            },
            editorReviewAssignments: {
              some: {
                stage: "first",
                status: "completed",
              },
            },
            editorReviewStatus: "second_in_progress",
            id: workId,
          },
        },
        select: {
          id: true,
          startedAt: true,
          work: {
            select: {
              author: {
                select: {
                  email: true,
                  fullName: true,
                },
              },
              authorId: true,
              id: true,
              slug: true,
              title: true,
            },
          },
        },
      });

    if (!assignment) {
      return {
        status: "error",
        message: "Bu eser için tamamlanabilir bir ikinci editör görevi bulunmuyor.",
      };
    }

    await prisma.$transaction(async (transaction) => {
      const completedAssignment =
        await transaction.editorReviewAssignment.updateMany({
          where: {
            editorId: editor.id,
            id: assignment.id,
            stage: "second",
            status: {
              in: ["assigned", "in_progress"],
            },
            workId: assignment.work.id,
          },
          data: {
            completedAt,
            startedAt: assignment.startedAt ?? completedAt,
            status: "completed",
          },
        });

      if (completedAssignment.count !== 1) {
        throw new Error("SECOND_REVIEW_ALREADY_COMPLETED");
      }

      const existing =
        await transaction.editorFeedback.findFirst({
          where: {
            editorId: editor.id,
            isProfessionalReview: true,
            workId: assignment.work.id,
            OR: [
              {
                assignmentId: assignment.id,
              },
              {
                assignmentId: null,
              },
            ],
          },
          select: {
            id: true,
          },
        });

      if (existing) {
        await transaction.editorFeedback.update({
          where: {
            id: existing.id,
          },
          data: {
            ...values,
            assignmentId: assignment.id,
            reportStatus: "completed",
          },
        });
      } else {
        await transaction.editorFeedback.create({
          data: {
            ...values,
            assignmentId: assignment.id,
            authorId: assignment.work.authorId,
            editorId: editor.id,
            isProfessionalReview: true,
            reportStatus: "completed",
            workId: assignment.work.id,
          },
        });
      }

      const completedWork = await transaction.work.updateMany({
        where: {
          id: assignment.work.id,
          editorReviewStatus: "second_in_progress",
          AND: [
            {
              editorReviewAssignments: {
                some: {
                  stage: "first",
                  status: "completed",
                },
              },
            },
            {
              editorReviewAssignments: {
                some: {
                  editorId: editor.id,
                  id: assignment.id,
                  stage: "second",
                  status: "completed",
                },
              },
            },
          ],
        },
        data: {
          editorReviewCompletedAt: completedAt,
          editorReviewStatus: "completed",
        },
      });

      if (completedWork.count !== 1) {
        throw new Error("FINAL_REVIEW_STATE_CHANGED");
      }

      await transaction.notification.create({
        data: {
          message: `${assignment.work.title} adlı eserinizin iki aşamalı profesyonel editör incelemesi tamamlandı.`,
          relatedEntityId: assignment.work.id,
          relatedEntityType: "work",
          title: "Profesyonel inceleme tamamlandı",
          type: "editor_review",
          userId: assignment.work.authorId,
        },
      });
    });

    try {
      await sendAuthorEditorStatusEmail({
        email: assignment.work.author.email,
        fullName: assignment.work.author.fullName,
        stage: "completed",
        workId: assignment.work.id,
        workTitle: assignment.work.title,
      });
    } catch (emailError) {
      console.error(
        "EDITOR_EMAIL_DELIVERY_FAILED",
        {
          event: "second_review_completed",
          workId: assignment.work.id,
          error:
            emailError instanceof Error
              ? emailError.message
              : "UNKNOWN_ERROR",
        },
      );
    }

    refreshEditorFlow(assignment.work.slug);
    revalidatePath("/geri-bildirimler");

    return {
      status: "success",
      message: "İkinci editör incelemesi tamamlandı. Nihai rapor yazara iletildi.",
    };
  } catch {
    return {
      status: "error",
      message: "İkinci editör incelemesi tamamlanamadı.",
    };
  }
}
