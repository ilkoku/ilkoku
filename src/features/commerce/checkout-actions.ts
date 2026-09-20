"use server";

import { redirect } from "next/navigation";

import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { completeZeroTotalCheckout } from "./zero-total-checkout";

function destination(slug: string, status: string, from?: string) {
  const query = new URLSearchParams({ durum: status });
  if (from) query.set("from", from);
  return `/satinal/${encodeURIComponent(slug)}?${query.toString()}`;
}

export async function completeZeroTotalCheckoutAction(formData: FormData) {
  const user = await getCurrentUser();
  const slug = String(formData.get("slug") ?? "").trim();
  const couponCode = String(formData.get("couponCode") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();

  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(destination(slug, "giris-gerekli", returnTo))}`);
  }

  if (!canAccessReaderWorkspace(user.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  if (!slug) {
    redirect("/okuyucu");
  }

  if (formData.get("acceptDigitalContent") !== "on") {
    redirect(destination(slug, "kosul-onayi-gerekli", returnTo));
  }

  const work = await prisma.work.findFirst({
    where: {
      slug,
      archivedAt: null,
      isActive: true,
      publishedAt: { not: null },
      status: "published",
      visibility: "public",
    },
    select: { id: true },
  });

  if (!work) {
    redirect(destination(slug, "eser-bulunamadi", returnTo));
  }

  await enforceAdultWorkGate({
    returnTo: destination(slug, "yas-kontrolu", returnTo),
    slug,
    user,
  });

  const result = await completeZeroTotalCheckout({
    couponCode,
    readerId: user.id,
    workId: work.id,
  });

  if (result.ok) {
    redirect(
      `/kutuphanem/satin-aldiklarim?durum=eklendi&siparis=${encodeURIComponent(result.orderNo)}`,
    );
  }

  if (result.reason === "already_entitled") {
    redirect("/kutuphanem/satin-aldiklarim?durum=zaten-erisim-var");
  }

  const statusByReason = {
    checkout_disabled: "tahsilat-kapali",
    work_unavailable: "eser-hazir-degil",
    coupon_invalid: "kupon-gecersiz",
    not_zero_total: "sifir-toplam-gerekli",
  } as const;

  redirect(destination(slug, statusByReason[result.reason], returnTo));
}
