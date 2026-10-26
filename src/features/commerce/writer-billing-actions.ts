"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const route = "/satis-erisim/odeme-vergi-bilgileri";
const common = z.object({
  invoiceStatus: z.enum(["invoicing", "non_invoicing"]),
});
const invoiceDetails = z.object({
  billingName: z.string().trim().min(3).max(240),
  taxIdentifier: z.string().trim().regex(/^\d{10,11}$/, "VKN/TCKN 10 veya 11 rakam olmalı."),
  taxOffice: z.string().trim().min(2).max(160),
  billingAddress: z.string().trim().min(12).max(5000),
});

export async function saveWriterBillingProfileAction(form: FormData) {
  const writer = await getCurrentUser();
  if (!writer) redirect("/giris?sonraki=%2Fsatis-erisim%2Fodeme-vergi-bilgileri");
  if (writer.role !== "writer" || writer.status !== "active" || writer.isBanned || writer.deletedAt) {
    redirect("/erisim-reddedildi");
  }
  const status = common.safeParse({ invoiceStatus: form.get("invoiceStatus") });
  if (!status.success) redirect(`${route}?durum=durum-sec`);
  const isInvoicing = status.data.invoiceStatus === "invoicing";
  const detail = isInvoicing
    ? invoiceDetails.safeParse({
        billingName: form.get("billingName"),
        taxIdentifier: form.get("taxIdentifier"),
        taxOffice: form.get("taxOffice"),
        billingAddress: form.get("billingAddress"),
      })
    : null;
  if (detail && !detail.success) redirect(`${route}?durum=fatura-bilgisi-eksik`);

  // This is the author's declaration, not a tax-verification decision or a
  // seller authorization. Switching to no-invoice clears old invoice details.
  const payload = {
    invoiceStatus: status.data.invoiceStatus,
    billingName: detail?.data.billingName ?? null,
    taxIdentifier: detail?.data.taxIdentifier ?? null,
    taxOffice: detail?.data.taxOffice ?? null,
    billingAddress: detail?.data.billingAddress ?? null,
  };

  await prisma.$transaction(async (tx) => {
    const previous = await tx.authorBillingProfile.findUnique({
      where: { authorId: writer.id },
      select: { invoiceStatus: true },
    });
    await tx.authorBillingProfile.upsert({
      where: { authorId: writer.id },
      create: { authorId: writer.id, ...payload },
      update: payload,
    });
    await tx.auditLog.create({
      data: {
        actorId: writer.id,
        action: "work_status_changed",
        entityType: "AuthorBillingProfile",
        entityId: writer.id,
        metadata: JSON.stringify({
          source: "writer_invoice_status_self_declaration",
          previousStatus: previous?.invoiceStatus ?? null,
          declaredStatus: status.data.invoiceStatus,
          taxVerified: false,
        }),
      },
    });
  });
  revalidatePath(route);
  redirect(`${route}?durum=kaydedildi`);
}
