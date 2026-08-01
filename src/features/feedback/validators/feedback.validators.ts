import { z } from "zod";

export const feedbackIdSchema = z
  .string()
  .uuid("Geri bildirim kimliği geçersiz.");

export const feedbackGroupSchema = z.object({
  feedbackIds: z
    .array(feedbackIdSchema)
    .length(
      2,
      "Profesyonel inceleme dosyası iki rapordan oluşmalıdır.",
    ),
  workId: z
    .string()
    .uuid("Eser kimliği geçersiz."),
});
