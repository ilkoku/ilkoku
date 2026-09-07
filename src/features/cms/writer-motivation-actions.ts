"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsPublisher } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import {
  normalizeWriterMotivations,
  WRITER_MOTIVATION_KEY,
  WRITER_MOTIVATION_MINIMUM,
  WRITER_MOTIVATION_NAMESPACE,
} from "@/lib/writer-motivation-config";

export async function saveWriterMotivationsAction(formData: FormData) {
  const access = await requireCmsPublisher("/icerik/motivasyon");
  const user = access.user!;
  const motivations = normalizeWriterMotivations(
    formData.getAll("motivation").map((value) => String(value)),
  );

  if (!motivations || motivations.length < WRITER_MOTIVATION_MINIMUM) {
    redirect("/icerik/motivasyon?hata=seri");
  }

  const valueJson = JSON.stringify({
    version: 1,
    motivations,
  });

  try {
    await prisma.$executeRaw`
      INSERT INTO SiteContent (
        id, namespace, contentKey, valueJson, valueType, status,
        publishedAt, updatedById, createdAt, updatedAt
      ) VALUES (
        ${randomUUID()}, ${WRITER_MOTIVATION_NAMESPACE}, ${WRITER_MOTIVATION_KEY},
        ${valueJson}, 'json', 'published', CURRENT_TIMESTAMP(3), ${user.id},
        CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
      ON DUPLICATE KEY UPDATE
        valueJson = VALUES(valueJson),
        valueType = 'json',
        status = 'published',
        publishedAt = CURRENT_TIMESTAMP(3),
        updatedById = VALUES(updatedById),
        updatedAt = CURRENT_TIMESTAMP(3)
    `;
  } catch (error) {
    console.error("WRITER_MOTIVATIONS_SAVE_FAILED", error);
    redirect("/icerik/motivasyon?hata=kayit");
  }

  revalidatePath("/icerik/motivasyon");
  revalidatePath("/yazar");
  redirect("/icerik/motivasyon?kaydedildi=1");
}
