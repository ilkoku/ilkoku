"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const scopeSchema = z.enum(["all_paid_works", "selected_works", "selected_authors"]);
const discountTypeSchema = z.enum(["percent", "fixed"]);

async function authenticatedAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized || !/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseFixedMinorUnits(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const amount = BigInt(`${whole}${fraction.padEnd(2, "0")}`);
  return amount > 0n ? amount : null;
}

function parseOptionalDate(value: FormDataEntryValue | null, endOfDay = false) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  const parsed = new Date(`${normalized}T${time}+03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function destination(status: string) {
  return `/sistem-yonetimi/odeme-sistemi/kuponlar?durum=${encodeURIComponent(status)}`;
}

export async function createPlatformCouponAction(formData: FormData) {
  const admin = await authenticatedAdmin();
  if (!admin) redirect("/erisim-reddedildi?kaynak=system_management");

  const parsedScope = scopeSchema.safeParse(formData.get("scope"));
  const parsedDiscountType = discountTypeSchema.safeParse(formData.get("discountType"));
  if (!parsedScope.success || !parsedDiscountType.success) {
    redirect(destination("eksik-bilgi"));
  }

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) redirect(destination("gecersiz-kod"));

  const discountValue =
    parsedDiscountType.data === "percent"
      ? BigInt(parsePositiveInteger(formData.get("discountValue")) ?? 0)
      : parseFixedMinorUnits(formData.get("discountValue")) ?? 0n;
  if (discountValue <= 0n || (parsedDiscountType.data === "percent" && discountValue > 100n)) {
    redirect(destination("gecersiz-indirim"));
  }

  const startsAt = parseOptionalDate(formData.get("startsAt"));
  const endsAt = parseOptionalDate(formData.get("endsAt"), true);
  if (startsAt && endsAt && endsAt < startsAt) redirect(destination("gecersiz-tarih"));

  const totalUsageLimit = parsePositiveInteger(formData.get("totalUsageLimit"));
  const perUserUsageLimit = parsePositiveInteger(formData.get("perUserUsageLimit")) ?? 1;
  const requestedWorkIds = Array.from(new Set(formData.getAll("workIds").map(String).filter(Boolean)));
  const requestedAuthorIds = Array.from(new Set(formData.getAll("authorIds").map(String).filter(Boolean)));

  let workIds: string[] = [];
  let authorIds: string[] = [];

  if (parsedScope.data === "selected_works") {
    if (requestedWorkIds.length === 0) redirect(destination("kapsam-gerekli"));
    const works = await prisma.work.findMany({
      where: {
        id: { in: requestedWorkIds },
        archivedAt: null,
        saleConfiguration: { is: { saleModel: "paid" } },
      },
      select: { id: true },
    });
    workIds = works.map((work) => work.id);
    if (workIds.length !== requestedWorkIds.length) redirect(destination("gecersiz-kapsam"));
  }

  if (parsedScope.data === "selected_authors") {
    if (requestedAuthorIds.length === 0) redirect(destination("kapsam-gerekli"));
    const authors = await prisma.user.findMany({
      where: {
        id: { in: requestedAuthorIds },
        role: "writer",
        status: "active",
        deletedAt: null,
      },
      select: { id: true },
    });
    authorIds = authors.map((author) => author.id);
    if (authorIds.length !== requestedAuthorIds.length) redirect(destination("gecersiz-kapsam"));
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const coupon = await transaction.coupon.create({
        data: {
          code,
          owner: "platform",
          creatorId: admin.id,
          discountType: parsedDiscountType.data,
          discountValue,
          scope: parsedScope.data,
          status: "active",
          startsAt,
          endsAt,
          totalUsageLimit,
          perUserUsageLimit,
        },
      });

      if (workIds.length > 0) {
        await transaction.couponWorkScope.createMany({
          data: workIds.map((workId) => ({ couponId: coupon.id, workId })),
        });
      }

      if (authorIds.length > 0) {
        await transaction.couponAuthorScope.createMany({
          data: authorIds.map((authorId) => ({ couponId: coupon.id, authorId })),
        });
      }
    });
  } catch (error) {
    console.error("CREATE_PLATFORM_COUPON_ERROR", error);
    redirect(destination("kupon-kodu-kullaniliyor"));
  }

  revalidatePath("/sistem-yonetimi/odeme-sistemi/kuponlar");
  redirect(destination("kupon-olusturuldu"));
}

export async function togglePlatformCouponAction(formData: FormData) {
  const admin = await authenticatedAdmin();
  if (!admin) redirect("/erisim-reddedildi?kaynak=system_management");

  const couponId = String(formData.get("couponId") ?? "").trim();
  const nextStatus = formData.get("nextStatus") === "active" ? "active" : "paused";
  if (!couponId) redirect(destination("kupon-bulunamadi"));

  const updated = await prisma.coupon.updateMany({
    where: { id: couponId, owner: "platform" },
    data: { status: nextStatus },
  });
  if (updated.count === 0) redirect(destination("kupon-bulunamadi"));

  revalidatePath("/sistem-yonetimi/odeme-sistemi/kuponlar");
  redirect(destination("kupon-guncellendi"));
}
