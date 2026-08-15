"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsAdmin } from "@/lib/cms-access";
import {
  createsCmsRedirectCycle,
  normalizeCmsRedirectPath,
  parseCmsRedirectValue,
} from "@/lib/cms-redirects";
import { prisma } from "@/lib/prisma";

type RedirectRow = { contentKey: string; valueJson: string };

export async function saveCmsRedirectAction(formData: FormData) {
  const access = await requireCmsAdmin("/icerik/yonlendirmeler");
  const user = access.user!;

  let source = "";
  let target = "";
  try {
    source = normalizeCmsRedirectPath(formData.get("source"), "source");
    target = normalizeCmsRedirectPath(formData.get("target"), "target");
  } catch {
    redirect("/icerik/yonlendirmeler?hata=yol");
  }

  if (source === target) redirect("/icerik/yonlendirmeler?hata=ayni");

  const rows = await prisma.$queryRaw<RedirectRow[]>`
    SELECT contentKey, valueJson
    FROM SiteContent
    WHERE namespace = 'redirect'
      AND status = 'published'
  `;

  const parsed = rows.map((row) => ({ row, value: parseCmsRedirectValue(row.valueJson) }));
  if (parsed.some((item) => !item.value)) {
    redirect("/icerik/yonlendirmeler?hata=veri");
  }
  const active = parsed.flatMap(({ row, value }) => value ? [{ source: value.source || row.contentKey, target: value.target }] : []);

  if (createsCmsRedirectCycle(source, target, active)) {
    redirect("/icerik/yonlendirmeler?hata=dongu");
  }

  const valueJson = JSON.stringify({ source, target, code: 308 });
  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, 'redirect', ${source}, ${valueJson}, 'json', 'published',
      CURRENT_TIMESTAMP(3), ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      valueType = 'json',
      status = 'published',
      publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;

  revalidatePath("/icerik");
  revalidatePath("/icerik/yonlendirmeler");
  redirect("/icerik/yonlendirmeler?kayit=1");
}

export async function archiveCmsRedirectAction(formData: FormData) {
  const access = await requireCmsAdmin("/icerik/yonlendirmeler");
  const user = access.user!;

  let source = "";
  try {
    source = normalizeCmsRedirectPath(formData.get("source"), "source");
  } catch {
    redirect("/icerik/yonlendirmeler?hata=yol");
  }

  await prisma.$executeRaw`
    UPDATE SiteContent
    SET status = 'archived', publishedAt = NULL,
        updatedById = ${user.id}, updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = 'redirect'
      AND contentKey = ${source}
  `;

  revalidatePath("/icerik");
  revalidatePath("/icerik/yonlendirmeler");
  redirect("/icerik/yonlendirmeler?arsiv=1");
}
