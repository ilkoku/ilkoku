import { z } from "zod";

import {
  workContentRatings,
  workContentWarnings,
} from "@/lib/work-content-classification";

const trimmedText = (minimum: number, maximum: number, message: string) =>
  z.string().trim().min(minimum, message).max(maximum, message);

export const workTypeSchema = z.enum(["novel", "story", "poetry", "essay", "memoir", "other"]);

export const workContentRatingSchema = z.enum(workContentRatings, {
  error: "Eser için bir içerik ve yaş sınıfı seçilmelidir.",
});

export const workContentWarningSchema = z.enum(workContentWarnings);

const workClassificationSchema = z.object({
  contentClassificationConfirmed: z.literal(true, {
    error: "İçerik sınıfının eserin en yoğun bölümüne göre seçildiğini onaylamalısın.",
  }),
  contentRating: workContentRatingSchema,
  contentWarnings: z.array(workContentWarningSchema).max(
    workContentWarnings.length,
    "İçerik uyarıları doğrulanamadı.",
  ),
}).superRefine((value, context) => {
  if (value.contentRating !== "all_ages" && value.contentWarnings.length === 0) {
    context.addIssue({
      code: "custom",
      message: "13+, 16+ veya 18+ sınıfındaki eser için en az bir içerik uyarısı seçilmelidir.",
      path: ["contentWarnings"],
    });
  }
});

export const createWorkSchema = z.object({
  genre: trimmedText(1, 100, "Tür alanı 1–100 karakter olmalıdır."),
  summary: z.string().trim().max(5000, "Özet en fazla 5000 karakter olabilir.").optional(),
  title: trimmedText(1, 200, "Başlık alanı 1–200 karakter olmalıdır."),
  workType: workTypeSchema.default("novel"),
}).and(workClassificationSchema);

export const updateWorkSchema = z.object({
  genre: trimmedText(1, 100, "Tür alanı 1–100 karakter olmalıdır.").optional(),
  summary: z.string().trim().max(5000, "Özet en fazla 5000 karakter olabilir.").optional(),
  title: trimmedText(1, 200, "Başlık alanı 1–200 karakter olmalıdır.").optional(),
  workType: workTypeSchema.optional(),
  coverUrl: z.union([z.string().trim().url("Kapak adresi geçerli bir URL olmalıdır."), z.literal("")]).optional(),
  id: z.string().uuid("Geçerli bir eser seçilmelidir."),
  language: z.string().trim().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/, "Dil kodu geçersiz.").optional(),
  status: z.enum(["draft", "in_progress", "published"]).optional(),
}).and(workClassificationSchema);

export const chapterDraftSchema = z.object({
  chapterId: z.string().uuid("Geçerli bir bölüm seçilmelidir."),
  content: z.string().max(500_000, "Bölüm metni çok uzun."),
  title: trimmedText(1, 200, "Bölüm başlığı 1–200 karakter olmalıdır."),
  workId: z.string().uuid("Geçerli bir eser seçilmelidir."),
});

export const workIdSchema = z.object({
  workId: z.string().uuid("Geçerli bir eser seçilmelidir."),
});

export type CreateWorkInput = z.infer<typeof createWorkSchema>;
export type UpdateWorkInput = z.infer<typeof updateWorkSchema>;
export type ChapterDraftInput = z.infer<typeof chapterDraftSchema>;
