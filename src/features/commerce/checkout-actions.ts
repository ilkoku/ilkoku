"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getActiveReaderPurchaseTerms } from "./checkout-terms";
import { startPaidCheckout } from "./paid-checkout";
import type { CommercePaymentMethod } from "./payment-providers";
import { completeZeroTotalCheckout } from "./zero-total-checkout";

function parsePaymentMethod(value: FormDataEntryValue | null): CommercePaymentMethod | null {
  return value === "card" || value === "carrier" ? value : null;
}

function absoluteCheckoutReturnUrl(slug: string, returnTo: string) {
  const siteUrl =
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const url = new URL("/satinal/" + encodeURIComponent(slug), siteUrl);
  if (returnTo) url.searchParams.set("from", returnTo);
  return url.toString();
}

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

  const terms = await getActiveReaderPurchaseTerms();
  if (!terms) {
    redirect(destination(slug, "satin-alma-kosullari-hazir-degil", returnTo));
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

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
  const userAgent = requestHeaders.get("user-agent");

  const result = await completeZeroTotalCheckout({
    consent: {
      documentHash: terms.documentHash,
      documentVersion: terms.version,
      ipAddress,
      userAgent,
    },
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


export async function beginPaidCheckoutAction(formData: FormData) {
  const user = await getCurrentUser();
  const slug = String(formData.get("slug") ?? "").trim();
  const couponCode = String(formData.get("couponCode") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const method = parsePaymentMethod(formData.get("paymentMethod"));

  if (!user) {
    redirect(
      `/giris?sonraki=${encodeURIComponent(
        destination(slug, "giris-gerekli", returnTo),
      )}`,
    );
  }

  if (!canAccessReaderWorkspace(user.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  if (!slug) {
    redirect("/okuyucu");
  }

  if (!method) {
    redirect(destination(slug, "odeme-yontemi-gerekli", returnTo));
  }

  if (formData.get("acceptDigitalContent") !== "on") {
    redirect(destination(slug, "kosul-onayi-gerekli", returnTo));
  }

  const terms = await getActiveReaderPurchaseTerms();
  if (!terms) {
    redirect(destination(slug, "satin-alma-kosullari-hazir-degil", returnTo));
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

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
  const userAgent = requestHeaders.get("user-agent");

  const result = await startPaidCheckout({
    consent: {
      documentHash: terms.documentHash,
      documentVersion: terms.version,
      ipAddress,
      userAgent,
    },
    couponCode: couponCode || null,
    method,
    readerId: user.id,
    returnUrl: absoluteCheckoutReturnUrl(slug, returnTo),
    workId: work.id,
  });

  if (result.ok) {
    redirect(result.redirectUrl);
  }

  if (result.reason === "already_entitled") {
    redirect("/kutuphanem/satin-aldiklarim?durum=zaten-erisim-var");
  }

  if (result.reason === "order_pending") {
    const query = new URLSearchParams({
      durum: "siparis-bekliyor",
      from: returnTo,
    });
    if (result.orderNo) query.set("siparis", result.orderNo);
    redirect(`/satinal/${encodeURIComponent(slug)}?${query.toString()}`);
  }

  const statusByReason = {
    checkout_disabled: "tahsilat-kapali",
    provider_unavailable: "odeme-saglayicisi-hazir-degil",
    work_unavailable: "eser-hazir-degil",
    coupon_invalid: "kupon-gecersiz",
    zero_total_required: "sifir-toplam-akisi",
    provider_error: "odeme-baslatilamadi",
  } as const;

  redirect(destination(slug, statusByReason[result.reason], returnTo));
}
