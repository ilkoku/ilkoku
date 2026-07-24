"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const roles = ["reader", "writer", "editor", "publisher", "admin"] as const;
const statuses = ["active", "suspended", "disabled"] as const;

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/giris?sonraki=/admin");
  if (currentUser.role !== "admin") redirect("/erisim-reddedildi?kaynak=admin");
  return currentUser;
}

export async function updateUserRoleAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as (typeof roles)[number];

  if (!userId || !roles.includes(role)) return;
  if (userId === currentUser.id && role !== "admin") return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}

export async function updateUserStatusAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof statuses)[number];

  if (!userId || !statuses.includes(status)) return;
  if (userId === currentUser.id && status !== "active") return;

  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/admin");
}
