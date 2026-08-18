import { z } from "zod";

export const feedbackIdSchema = z
  .string()
  .uuid("Geri bildirim kimliği geçersiz.");

export const feedbackGroupSchema = z.object({
  feedbackIds: z
    .array(feedbackIdSchema)
    .min(
      1,
      "Profesyonel inceleme dosyasında en az bir tamamlanmış rapor bulunmalıdır.",
    )
    .max(
      2,
      "Profesyonel inceleme dosyasında en fazla iki rapor bulunabilir.",
    ),
  workId: z
    .string()
    .uuid("Eser kimliği geçersiz."),
});
