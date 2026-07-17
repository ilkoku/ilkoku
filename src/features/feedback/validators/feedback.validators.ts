import { z } from "zod";

export const feedbackCategories = ["genel", "kurgu", "karakter", "anlatım", "dil", "yapı", "yayın_hazırlığı"] as const;
export const feedbackPriorities = ["normal", "important"] as const;

export const feedbackIdSchema = z.string().uuid("Geri bildirim kimliği geçersiz.");

export const createEditorFeedbackSchema = z.object({
  category: z.enum(feedbackCategories, { message: "Geçerli bir kategori seçmelisin." }),
  chapterId: z.union([z.string().uuid("Bölüm kimliği geçersiz."), z.literal(""), z.null()]).optional(),
  content: z.string().trim().min(20, "Geri bildirim en az 20 karakter olmalı.").max(20000, "Geri bildirim en fazla 20.000 karakter olabilir."),
  priority: z.enum(feedbackPriorities, { message: "Geçerli bir öncelik seçmelisin." }),
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı.").max(160, "Başlık en fazla 160 karakter olabilir."),
  workId: z.string().uuid("Eser kimliği geçersiz."),
});

export type CreateEditorFeedbackInput = z.infer<typeof createEditorFeedbackSchema>;
