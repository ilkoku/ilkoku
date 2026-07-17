import { z } from "zod";

export const createSubmissionSchema = z.object({
  coverLetter: z.string().trim().min(20, "Ön yazı en az 20 karakter olmalıdır.").max(3000, "Ön yazı en fazla 3000 karakter olabilir."),
  publisherId: z.string().uuid("Geçersiz yayınevi."),
  workId: z.string().uuid("Geçersiz eser."),
});

export const submissionIdSchema = z.string().uuid("Geçersiz başvuru.");
