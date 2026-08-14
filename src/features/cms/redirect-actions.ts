"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

function normalizePath(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) throw new Error("Geçersiz site içi yol.");
  const clean = raw.split("?")[0].replace(/\/+$/, "") || "/";
  if (clean.startsWith("/icerik") || clean.startsWith("/admin") || clean.startsWith("/api")) throw new Error("Yönetim ve API yolları yönlendirilemez.");
  return clean;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Yetkisiz işlem.");
  return user;
}

export async function saveRedirect(formData: FormData) {
  const user = await requireAdmin();
  const source = normalizePath(formData.get("source"));
  const target = normalizePath(formData.get("target"));
  if (source === target) throw new Error("Kaynak ve hedef aynı olamaz.");

  const valueJson = JSON.stringify({ source, target, code: 308 });
  await prisma.$executeRaw`
    INSERT INTO SiteContent (id, namespace, contentKey, valueJson, valueType, status, updatedById, createdAt, updatedAt)
    VALUES (UUID(), 'redirect', ${source}, ${valueJson}, 'json', 'published', ${user.id}, NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE valueJson = VALUES(valueJson), status = 'published', updatedById = VALUES(updatedById), updatedAt = NOW(3)
  `;

  revalidatePath("/icerik/yonlendirmeler");
  redirect("/icerik/yonlendirmeler");
}

export async function archiveRedirect(formData: FormData) {
  const user = await requireAdmin();
  const source = normalizePath(formData.get("source"));
  await prisma.$executeRaw`
    UPDATE SiteContent SET status = 'archived', updatedById = ${user.id}, updatedAt = NOW(3)
    WHERE namespace = 'redirect' AND contentKey = ${source}
  `;
  revalidatePath("/icerik/yonlendirmeler");
}
