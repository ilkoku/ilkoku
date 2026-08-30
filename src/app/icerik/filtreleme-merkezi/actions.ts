"use server";

import { revalidatePath } from "next/cache";

import { requireCmsAdmin } from "@/lib/cms-access";
import { setDiscoverySurfaceFilterEnabled } from "@/lib/discovery-filter-config";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function changeFilter(formData: FormData, enabled: boolean) {
  const access = await requireCmsAdmin("/icerik/filtreleme-merkezi");
  const surfaceId = formValue(formData, "surfaceId");
  const filterId = formValue(formData, "filterId");

  if (!surfaceId || !filterId) throw new Error("FILTRE_AYARI_EKSIK");

  const route = await setDiscoverySurfaceFilterEnabled({
    actorId: access.user!.id,
    enabled,
    filterId,
    surfaceId,
  });

  revalidatePath("/icerik/filtreleme-merkezi");
  revalidatePath(route);
}

export async function addDiscoveryFilterAction(formData: FormData) {
  await changeFilter(formData, true);
}

export async function removeDiscoveryFilterAction(formData: FormData) {
  await changeFilter(formData, false);
}
