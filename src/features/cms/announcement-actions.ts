"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/icerik/duyurular");
  if (user.role !== "admin") redirect("/erisim-reddedildi?kaynak=icerik");
  return user;
}

function value(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function createAnnouncementAction(formData: FormData) {
  const user = await requireAdmin();
  const id = randomUUID();
  const title = value(formData, "title", 220);
  const body = value(formData, "body", 2000);
  if (!title || !body) return;

  const payload = JSON.stringify({
    id,
    title,
    body,
    type: value(formData, "type", 40) || "info",
    audience: value(formData, "audience", 40) || "all",
    startsAt: value(formData, "startsAt", 40),
    endsAt: value(formData, "endsAt", 40),
  });

  await prisma.$executeRaw`
    INSERT INTO SiteContent (id, namespace, contentKey, valueJson, valueType, status, updatedById, createdAt, updatedAt)
    VALUES (${id}, 'announcement', ${`item_${id}`}, ${payload}, 'json', 'draft', ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
  `;

  revalidatePath("/icerik/duyurular");
}

export async function setAnnouncementStatusAction(formData: FormData) {
  const user = await requireAdmin();
  const contentKey = value(formData, "contentKey", 200);
  const mode = value(formData, "mode", 20);
  if (!contentKey.startsWith("item_")) return;

  if (mode === "publish") {
    await prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'published', publishedAt = CURRENT_TIMESTAMP(3), updatedById = ${user.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'announcement' AND contentKey = ${contentKey}
    `;
  } else if (mode === "archive") {
    await prisma.$executeRaw`
      UPDATE SiteContent
      SET status = 'archived', publishedAt = NULL, updatedById = ${user.id}, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE namespace = 'announcement' AND contentKey = ${contentKey}
    `;
  }

  revalidatePath("/icerik/duyurular");
  revalidatePath("/");
}
