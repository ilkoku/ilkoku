"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/giris?sonraki=/icerik/ana-sayfa");
  }

  if (user.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=icerik");
  }

  return user;
}

export async function saveHomepageHeroAction(formData: FormData) {
  const user = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !description) return;

  const valueJson = JSON.stringify({ title, description });

  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, 'homepage', 'hero', ${valueJson}, 'json', 'draft',
      ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = 'draft',
      publishedAt = NULL,
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  revalidatePath("/icerik/ana-sayfa");
}

export async function publishHomepageHeroAction() {
  const user = await requireAdmin();

  await prisma.$executeRaw`
    UPDATE SiteContent
    SET status = 'published',
      publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = ${user.id},
      updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = 'homepage'
      AND contentKey = 'hero'
  `;

  revalidatePath("/");
  revalidatePath("/icerik/ana-sayfa");
}
