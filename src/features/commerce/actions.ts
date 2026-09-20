"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const workIdSchema = z.string().uuid();
const publicationModelSchema = z.enum(["free", "paid"]);

async function authenticatedWriter() {
  const user = await getCurrentUser();
  return user?.role === "writer" ? user : null;
}

function parseTryMinorUnits(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;

  const [whole, fraction = ""] = value.split(".");
  const minorText = `${whole}${fraction.padEnd(2, "0")}`;
  const amount = BigInt(minorText);

  return amount > 0n ? amount : null;
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

  const priceAmount =
    parsedModel.data === "paid"
      ? parseTryMinorUnits(formData.get("price"))
      : null;

  if (parsedModel.data === "paid" && priceAmount === null) {
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
