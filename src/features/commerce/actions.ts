"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  getActiveAuthorPublicationAgreement,
  getAuthorAgreementAcceptance,
} from "./agreement";
import { hasOperationalPaymentProvider } from "./payment-providers";
import { isCommerceCheckoutEnabled } from "./runtime";

const workIdSchema = z.string().uuid();
const publicationModelSchema = z.enum(["free", "paid"]);
const couponDiscountTypeSchema = z.enum(["percent", "fixed"]);

async function authenticatedWriter() {
  const user = await getCurrentUser();
  return user?.role === "writer" ? user : null;
}


function parseTryMinorUnits(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const amount = BigInt(`${whole}${fraction.padEnd(2, "0")}`);
  return amount > BigInt(0) ? amount : null;
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseFixedMinorUnits(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const amount = BigInt(`${whole}${fraction.padEnd(2, "0")}`);
  return amount > BigInt(0) ? amount : null;
}

function parseOptionalDate(
  value: FormDataEntryValue | null,
  endOfDay = false,
) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  const parsed = new Date(`${normalized}T${time}+03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function commerceStatusRedirect(workId: string, status: string): never {
  redirect(
    `/satis-erisim/${encodeURIComponent(workId)}?durum=${encodeURIComponent(status)}`,
  );
}

function revalidateCommerce(workId: string) {
  revalidatePath("/satis-erisim");
  revalidatePath(`/satis-erisim/${workId}`);
  revalidatePath("/gelirler");
}

export async function saveChapterAccessPlanAction(formData: FormData) {
  const parsedWorkId = workIdSchema.safeParse(formData.get("workId"));
  if (!parsedWorkId.success) return;

  const writer = await authenticatedWriter();
  if (!writer) return;

  const work = await prisma.work.findFirst({
    where: {
      id: parsedWorkId.data,
      authorId: writer.id,
      archivedAt: null,
    },
    select: {
      chapters: {
        where: { archivedAt: null },
        select: { id: true },
      },
    },
  });

  if (!work) return;

  await prisma.$transaction(
    work.chapters.map((chapter) => {
      const raw = formData.get(`chapter:${chapter.id}`);
      const accessType = raw === "locked" ? "locked" : "preview";

      return prisma.chapterAccess.upsert({
        where: { chapterId: chapter.id },
        create: {
          chapterId: chapter.id,
          workId: parsedWorkId.data,
          accessType,
        },
        update: {
          accessType,
        },
      });
    }),
  );

  revalidateCommerce(parsedWorkId.data);
}

export async function saveWorkSaleModelAction(formData: FormData) {
  const parsedWorkId = workIdSchema.safeParse(formData.get("workId"));
  const parsedModel = publicationModelSchema.safeParse(formData.get("saleModel"));

  if (!parsedWorkId.success || !parsedModel.success) return;

  const writer = await authenticatedWriter();
  if (!writer) return;

  const work = await prisma.work.findFirst({
    where: {
      id: parsedWorkId.data,
      authorId: writer.id,
      archivedAt: null,
    },
    select: {
      id: true,
      saleConfiguration: {
        select: {
          priceAmount: true,
          saleModel: true,
        },
      },
    },
  });

  if (!work) return;

  const checkoutEnabled = isCommerceCheckoutEnabled();
  const priceAmount =
    parsedModel.data === "free"
      ? null
      : checkoutEnabled
        ? parseTryMinorUnits(formData.get("price"))
        : BigInt(0);

  if (
    parsedModel.data === "paid" &&
    checkoutEnabled &&
    priceAmount === null
  ) {
    return;
  }

  await prisma.$transaction(async (transaction) => {
    const oldPrice = work.saleConfiguration?.priceAmount ?? null;
    const oldModel = work.saleConfiguration?.saleModel ?? null;

    await transaction.workSaleConfiguration.upsert({
      where: { workId: work.id },
      create: {
        workId: work.id,
        authorId: writer.id,
        saleModel: parsedModel.data,
        priceAmount,
        currency: "TRY",
        status: "draft",
      },
      update: {
        saleModel: parsedModel.data,
        priceAmount,
        currency: "TRY",
        status: "draft",
      },
    });

    if (oldPrice !== priceAmount || oldModel !== parsedModel.data) {
      await transaction.workPriceHistory.create({
        data: {
          workId: work.id,
          authorId: writer.id,
          oldPrice,
          newPrice: priceAmount,
          currency: "TRY",
        },
      });
    }
  });

  revalidateCommerce(work.id);
}


export async function acceptAuthorPublicationAgreementAction(formData: FormData) {
  const parsedWorkId = workIdSchema.safeParse(formData.get("workId"));
  if (!parsedWorkId.success) redirect("/satis-erisim");

  const writer = await authenticatedWriter();
  if (!writer) {
    redirect("/giris?sonraki=/satis-erisim");
  }

  if (formData.get("acceptAgreement") !== "on") {
    commerceStatusRedirect(parsedWorkId.data, "sozlesme-onayi-gerekli");
  }

  const work = await prisma.work.findFirst({
    where: {
      id: parsedWorkId.data,
      authorId: writer.id,
      archivedAt: null,
    },
    select: { id: true },
  });

  if (!work) {
    commerceStatusRedirect(parsedWorkId.data, "eser-bulunamadi");
  }

  const agreement = await getActiveAuthorPublicationAgreement();
  if (!agreement) {
    commerceStatusRedirect(parsedWorkId.data, "sozlesme-hazir-degil");
  }

  const existing = await prisma.authorAgreement.findUnique({
    where: {
      authorId_agreementType_agreementVersion: {
        authorId: writer.id,
        agreementType: "author_publication_access",
        agreementVersion: agreement.version,
      },
    },
  });

  if (existing && existing.documentHash !== agreement.documentHash) {
    commerceStatusRedirect(parsedWorkId.data, "sozlesme-surum-uyusmazligi");
  }

  if (existing && existing.status !== "accepted") {
    commerceStatusRedirect(parsedWorkId.data, "sozlesme-kaydi-kilitli");
  }

  if (!existing) {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
    const userAgent = requestHeaders.get("user-agent");

    await prisma.authorAgreement.create({
      data: {
        authorId: writer.id,
        agreementType: "author_publication_access",
        agreementVersion: agreement.version,
        documentHash: agreement.documentHash,
        status: "accepted",
        acceptedAt: new Date(),
        ipAddress,
        userAgent,
      },
    });
  }

  revalidateCommerce(parsedWorkId.data);
  commerceStatusRedirect(parsedWorkId.data, "sozlesme-kabul-edildi");
}

export async function confirmWorkPublicationCommerceAction(formData: FormData) {
  const parsedWorkId = workIdSchema.safeParse(formData.get("workId"));
  if (!parsedWorkId.success) redirect("/satis-erisim");

  const writer = await authenticatedWriter();
  if (!writer) {
    redirect("/giris?sonraki=/satis-erisim");
  }

  if (formData.get("confirmWork") !== "on") {
    commerceStatusRedirect(parsedWorkId.data, "eser-onayi-gerekli");
  }

  const agreement = await getActiveAuthorPublicationAgreement();
  if (!agreement) {
    commerceStatusRedirect(parsedWorkId.data, "sozlesme-hazir-degil");
  }

  const acceptedAgreement = await getAuthorAgreementAcceptance(
    writer.id,
    agreement,
  );
  if (!acceptedAgreement) {
    commerceStatusRedirect(parsedWorkId.data, "sozlesme-kabul-gerekli");
  }

  const work = await prisma.work.findFirst({
    where: {
      id: parsedWorkId.data,
      authorId: writer.id,
      archivedAt: null,
    },
    select: {
      id: true,
      chapters: {
        where: { archivedAt: null },
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          commerceAccess: {
            select: { accessType: true },
          },
        },
      },
      saleConfiguration: {
        select: {
          currency: true,
          priceAmount: true,
          saleModel: true,
        },
      },
    },
  });

  if (!work) {
    commerceStatusRedirect(parsedWorkId.data, "eser-bulunamadi");
  }

  if (!work.saleConfiguration) {
    commerceStatusRedirect(parsedWorkId.data, "yayin-modeli-gerekli");
  }

  if (work.chapters.length === 0) {
    commerceStatusRedirect(parsedWorkId.data, "bolum-gerekli");
  }

  if (work.chapters.some((chapter) => !chapter.commerceAccess)) {
    commerceStatusRedirect(parsedWorkId.data, "erisim-plani-gerekli");
  }

  const checkoutEnabled = isCommerceCheckoutEnabled();
  if (
    checkoutEnabled &&
    work.saleConfiguration.saleModel === "paid" &&
    (work.saleConfiguration.priceAmount === null ||
      work.saleConfiguration.priceAmount <= BigInt(0))
  ) {
    commerceStatusRedirect(parsedWorkId.data, "fiyat-gerekli");
  }

  const now = new Date();
  const paymentProviderReady = hasOperationalPaymentProvider();
  const nextStatus =
    work.saleConfiguration.saleModel === "free" ||
    (checkoutEnabled && paymentProviderReady)
      ? "active"
      : "ready";

  const accessPlanSnapshot = work.chapters.map((chapter) => ({
    accessType: chapter.commerceAccess?.accessType ?? "preview",
    chapterId: chapter.id,
    position: chapter.position,
  }));

  await prisma.$transaction(async (transaction) => {
    await transaction.workPublicationConsent.create({
      data: {
        workId: work.id,
        authorId: writer.id,
        publicationModel: work.saleConfiguration!.saleModel,
        priceAmount: work.saleConfiguration!.priceAmount,
        currency: work.saleConfiguration!.currency,
        accessPlanSnapshot,
        agreementVersion: agreement.version,
        confirmedAt: now,
      },
    });

    await transaction.workSaleConfiguration.update({
      where: { workId: work.id },
      data: {
        status: nextStatus,
        agreementVersion: agreement.version,
        confirmedAt: now,
        activatedAt: nextStatus === "active" ? now : null,
        pausedAt: null,
      },
    });
  });

  revalidateCommerce(work.id);
  commerceStatusRedirect(
    work.id,
    nextStatus === "active" ? "yayin-onaylandi" : "satis-hazir",
  );
}

export async function createAuthorCouponAction(formData: FormData) {
  const writer = await authenticatedWriter();
  if (!writer) redirect("/giris?sonraki=/satis-erisim/kuponlar");

  const parsedWorkId = workIdSchema.safeParse(formData.get("workId"));
  const parsedDiscountType = couponDiscountTypeSchema.safeParse(
    formData.get("discountType"),
  );

  if (!parsedWorkId.success || !parsedDiscountType.success) {
    redirect("/satis-erisim/kuponlar?durum=eksik-bilgi");
  }

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\\s+/g, "");

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    redirect("/satis-erisim/kuponlar?durum=gecersiz-kod");
  }

  const work = await prisma.work.findFirst({
    where: {
      id: parsedWorkId.data,
      authorId: writer.id,
      archivedAt: null,
    },
    select: {
      id: true,
      saleConfiguration: {
        select: { saleModel: true },
      },
    },
  });

  if (!work) redirect("/satis-erisim/kuponlar?durum=eser-bulunamadi");
  if (work.saleConfiguration?.saleModel !== "paid") {
    redirect("/satis-erisim/kuponlar?durum=ucretli-eser-gerekli");
  }

  const discountValue =
    parsedDiscountType.data === "percent"
      ? BigInt(parsePositiveInteger(formData.get("discountValue")) ?? 0)
      : parseFixedMinorUnits(formData.get("discountValue")) ?? BigInt(0);

  if (
    discountValue <= BigInt(0) ||
    (parsedDiscountType.data === "percent" && discountValue > BigInt(100))
  ) {
    redirect("/satis-erisim/kuponlar?durum=gecersiz-indirim");
  }

  const startsAt = parseOptionalDate(formData.get("startsAt"));
  const endsAt = parseOptionalDate(formData.get("endsAt"), true);
  if (startsAt && endsAt && endsAt < startsAt) {
    redirect("/satis-erisim/kuponlar?durum=gecersiz-tarih");
  }

  const totalUsageLimit = parsePositiveInteger(formData.get("totalUsageLimit"));
  const perUserUsageLimit =
    parsePositiveInteger(formData.get("perUserUsageLimit")) ?? 1;

  try {
    await prisma.$transaction(async (transaction) => {
      const coupon = await transaction.coupon.create({
        data: {
          code,
          owner: "author",
          authorId: writer.id,
          creatorId: writer.id,
          discountType: parsedDiscountType.data,
          discountValue,
          scope: "selected_works",
          status: "active",
          startsAt,
          endsAt,
          totalUsageLimit,
          perUserUsageLimit,
        },
      });

      await transaction.couponWorkScope.create({
        data: {
          couponId: coupon.id,
          workId: work.id,
        },
      });
    });
  } catch (error) {
    console.error("CREATE_AUTHOR_COUPON_ERROR", error);
    redirect("/satis-erisim/kuponlar?durum=kupon-kodu-kullaniliyor");
  }

  revalidatePath("/satis-erisim/kuponlar");
  redirect("/satis-erisim/kuponlar?durum=kupon-olusturuldu");
}

export async function toggleAuthorCouponAction(formData: FormData) {
  const writer = await authenticatedWriter();
  if (!writer) redirect("/giris?sonraki=/satis-erisim/kuponlar");

  const couponId = String(formData.get("couponId") ?? "").trim();
  const nextStatus = formData.get("nextStatus") === "active" ? "active" : "paused";

  if (!couponId) redirect("/satis-erisim/kuponlar?durum=kupon-bulunamadi");

  const updated = await prisma.coupon.updateMany({
    where: {
      id: couponId,
      authorId: writer.id,
      owner: "author",
    },
    data: { status: nextStatus },
  });

  if (updated.count === 0) {
    redirect("/satis-erisim/kuponlar?durum=kupon-bulunamadi");
  }

  revalidatePath("/satis-erisim/kuponlar");
  redirect("/satis-erisim/kuponlar?durum=kupon-guncellendi");
}
