"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COMMISSION_BPS, readRateBasisPoints } from "./commission-rates";

const PAGE = "/sistem-yonetimi/finans-gelirler/komisyon-yonetimi";
const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/u;

export async function recordCommissionRateAction(formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/giris?sonraki=" + encodeURIComponent(PAGE));
  if (actor.role !== "admin") redirect("/erisim-reddedildi?kaynak=admin");

  const authorId = String(formData.get("authorId") ?? "");
  const scope = String(formData.get("scope") ?? "");
  const workId = String(formData.get("workId") ?? "");
  const action = String(formData.get("rateAction") ?? "");
  const bps = readRateBasisPoints(String(formData.get("ratePercent") ?? ""));
  if (!uuid.test(authorId) || !["author","work"].includes(scope) ||
      !["set", "reset"].includes(action) || (scope === "work" && !uuid.test(workId)) ||
      (scope === "author" && workId) || (action === "set" && bps === null)) {
    redirect(PAGE + "?durum=gecersiz");
  }

  const writer = await prisma.user.findFirst({
    where: { id: authorId, role: "writer", status: "active", deletedAt: null },
    select: { id: true, publicId: true },
  });
  if (!writer) redirect(PAGE + "?durum=yazar-yok");
  if (scope === "work") {
    const validWork = await prisma.work.findFirst({
      where: { id: workId, authorId },
      select: { id: true },
    });
    if (!validWork) redirect(PAGE + "?durum=eser-yok");
  }

  // Append only; no update/delete, orders, ledger, taxes or payouts.
  await prisma.authorCommissionRateEvent.create({
    data: {
      authorId: writer.id,
      workId: scope === "work" ? workId : null,
      actorId: actor.id,
      rateBps: action === "set" ? bps! : DEFAULT_COMMISSION_BPS,
      active: action === "set",
    },
  });

  revalidatePath(PAGE);
  revalidatePath("/sistem-yonetimi/finans-gelirler/siparis-mali-inceleme");
  redirect(PAGE + "?yazar=" + encodeURIComponent(writer.publicId) + "&durum=kaydedildi");
}
