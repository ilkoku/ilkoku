"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCmsPublisher } from "@/lib/cms-access";
import {
  homepageAfterRolesSlotKey,
  parseAffiliateCreativeHtml,
  publishAdvertisingSlot,
} from "@/lib/cms-advertising";

function field(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

export async function saveHomepageAdvertisingAction(formData: FormData) {
  const { user } = await requireCmsPublisher("/icerik/banner-reklam");

  const active = field(formData, "status", 16) === "active";
  const advertiser = field(formData, "advertiser", 120);
  const heading = field(formData, "heading", 160);
  const description = field(formData, "description", 320);
  const disclosure = field(formData, "disclosure", 120);
  const desktop = parseAffiliateCreativeHtml(field(formData, "desktopHtml", 6000));
  const mobile = parseAffiliateCreativeHtml(field(formData, "mobileHtml", 6000));

  if (!advertiser || !heading || !description || !disclosure || !desktop || !mobile) {
    redirect("/icerik/banner-reklam?hata=kreatif");
  }

  if (desktop.width !== 728 || desktop.height !== 90 || mobile.width !== 300 || mobile.height !== 250) {
    redirect("/icerik/banner-reklam?hata=boyut");
  }

  await publishAdvertisingSlot(user!.id, homepageAfterRolesSlotKey, {
    active,
    advertiser,
    heading,
    description,
    disclosure,
    desktop,
    mobile,
  });

  revalidatePath("/");
  revalidatePath("/icerik/banner-reklam");
  redirect("/icerik/banner-reklam?kayit=1");
}
