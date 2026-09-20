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
import { isCommerceCheckoutEnabled } from "./runtime";

const workIdSchema = z.string().uuid();
const publicationModelSchema = z.enum(["free", "paid"]);

async function authenticatedWriter() {
  const user = await getCurrentUser();
  return user?.role === "writer" ? user : null;
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

  // During the infrastructure phase, paid works are staged with a fixed
  // zero price. Authors do not enter a monetary amount until real checkout
  // is intentionally enabled in a later product decision.
  const priceAmount = parsedModel.data === "paid" ? 0n : null;

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

  const existing = await getAuthorAgreementAcceptance(writer.id, agreement);
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

  const now = new Date();
  const checkoutEnabled = isCommerceCheckoutEnabled();
  const nextStatus =
    work.saleConfiguration.saleModel === "free" || checkoutEnabled
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
