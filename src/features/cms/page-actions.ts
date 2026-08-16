"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import { deleteCmsDraft, getCmsDraftState, pageDraftKey, saveCmsDraft } from "@/lib/cms-drafts";
import { cmsPageContentKey, cmsPagePublicPath, normalizeCmsPageSlug } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";

type ExistingPage = {
  id: string;
  contentKey: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

async function addRevision(pageId: string, userId: string, snapshot: Record<string, unknown>) {
  const rows = await prisma.$queryRaw<Array<{ version: number | bigint }>>`
    SELECT COALESCE(MAX(version), 0) + 1 AS version
    FROM ContentRevision
    WHERE pageId = ${pageId}
  `;
  const version = Number(rows[0]?.version ?? 1);
  await prisma.$executeRaw`
    INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
    VALUES (${randomUUID()}, ${pageId}, ${version}, ${JSON.stringify(snapshot)}, ${userId}, CURRENT_TIMESTAMP(3))
  `;
}

async function requireHealthyPageDraft(pageId: string) {
  const state = await getCmsDraftState(pageDraftKey(pageId));
  if (state.state === "corrupt") redirect(`/icerik/sayfalar/${pageId}?hata=taslak-bozuk`);
  return state;
}

function refreshCmsPage(id?: string, slug?: string) {
  revalidatePath("/icerik");
  revalidatePath("/icerik/sayfalar");
  revalidatePath("/icerik/yayin-kuyrugu");
  revalidatePath("/icerik/saglik");
  revalidatePath("/icerik/gecmis");
  if (id) {
    revalidatePath(`/icerik/sayfalar/${id}`);
    revalidatePath(`/icerik/onizleme/sayfa/${id}`);
  }
  if (slug) revalidatePath(slug);
  revalidatePath("/sitemap.xml");
}

export async function saveCmsPageAction(formData: FormData) {
  const mode = String(formData.get("mode") ?? "draft");
  let access = await requireCmsManager("/icerik/sayfalar");
  if (mode === "publish") access = await requireCmsPublisher("/icerik/sayfalar");
  const user = access.user!;

  const requestedId = String(formData.get("id") ?? "").trim();
  let existing: ExistingPage | null = null;
  if (requestedId) {
    const rows = await prisma.$queryRaw<ExistingPage[]>`
      SELECT id, contentKey, slug, status
      FROM ContentPage
      WHERE id = ${requestedId}
        AND contentKey LIKE 'page:tr:%'
      LIMIT 1
    `;
    existing = rows[0] ?? null;
    if (!existing) redirect("/icerik/sayfalar?hata=kayit");
    await requireHealthyPageDraft(existing.id);
  }

  let slugPart = "";
  try {
    slugPart = normalizeCmsPageSlug(existing ? existing.slug : formData.get("slug"));
  } catch {
    redirect("/icerik/sayfalar?hata=slug");
  }

  const title = String(formData.get("title") ?? "").trim().slice(0, 220);
  const summary = String(formData.get("summary") ?? "").trim().slice(0, 500);
  const body = String(formData.get("body") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim().slice(0, 220);
  const seoDescription = String(formData.get("seoDescription") ?? "").trim().slice(0, 500);
  const noIndex = formData.get("noIndex") === "on";
  if (!title || !body) redirect("/icerik/sayfalar?hata=zorunlu");

  const fullSlug = existing?.slug ?? cmsPagePublicPath(slugPart);
  const contentKey = existing?.contentKey ?? cmsPageContentKey(slugPart);
  const snapshot = {
    kind: "page",
    locale: "tr",
    title,
    summary,
    body,
    seoTitle,
    seoDescription,
    noIndex,
    status: mode === "publish" ? "published" : "draft",
  };

  if (existing?.status === "published" && mode !== "publish") {
    await saveCmsDraft(user.id, pageDraftKey(existing.id), snapshot);
    await addRevision(existing.id, user.id, snapshot);
    refreshCmsPage(existing.id, existing.slug);
    redirect(`/icerik/sayfalar/${existing.id}?taslak=1`);
  }

  const status = mode === "publish" ? "published" : "draft";
  const bodyJson = JSON.stringify({ summary, body });

  if (!existing) {
    const duplicate = await prisma.$queryRaw<Array<{ total: number | bigint }>>`
      SELECT COUNT(*) AS total FROM ContentPage
      WHERE slug = ${fullSlug} OR contentKey = ${contentKey}
    `;
    if (Number(duplicate[0]?.total ?? 0) > 0) redirect("/icerik/sayfalar?hata=slug");

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO ContentPage (
        id, contentKey, slug, title, status, bodyJson,
        seoTitle, seoDescription, canonicalUrl, noIndex, publishedAt,
        createdById, updatedById, createdAt, updatedAt
      ) VALUES (
        ${id}, ${contentKey}, ${fullSlug}, ${title}, ${status}, ${bodyJson},
        ${seoTitle || null}, ${seoDescription || summary || null}, ${fullSlug}, ${noIndex},
        ${status === "published" ? new Date() : null},
        ${user.id}, ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
    `;
    await addRevision(id, user.id, snapshot);
    refreshCmsPage(id, status === "published" ? fullSlug : undefined);
    redirect(`/icerik/sayfalar/${id}?kayit=1`);
  }

  await prisma.$executeRaw`
    UPDATE ContentPage
    SET title = ${title},
        status = ${status},
        bodyJson = ${bodyJson},
        seoTitle = ${seoTitle || null},
        seoDescription = ${seoDescription || summary || null},
        canonicalUrl = ${existing.slug},
        noIndex = ${noIndex},
        publishedAt = ${status === "published" ? new Date() : null},
        updatedById = ${user.id},
        updatedAt = CURRENT_TIMESTAMP(3)
    WHERE id = ${existing.id}
  `;
  await addRevision(existing.id, user.id, snapshot);
  if (mode === "publish") await deleteCmsDraft(pageDraftKey(existing.id));
  refreshCmsPage(existing.id, existing.slug);
  redirect(`/icerik/sayfalar/${existing.id}?kayit=1`);
}

export async function archiveCmsPageAction(formData: FormData) {
  let access = await requireCmsManager("/icerik/sayfalar");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const rows = await prisma.$queryRaw<ExistingPage[]>`
    SELECT id, contentKey, slug, status
    FROM ContentPage
    WHERE id = ${id} AND contentKey LIKE 'page:tr:%'
    LIMIT 1
  `;
  const page = rows[0];
  if (!page) return;
  if (page.status === "published") access = await requireCmsPublisher("/icerik/sayfalar");
  const user = access.user!;

  await requireHealthyPageDraft(page.id);
  await prisma.$executeRaw`
    UPDATE ContentPage
    SET status = 'archived', publishedAt = NULL, updatedById = ${user.id}, updatedAt = CURRENT_TIMESTAMP(3)
    WHERE id = ${page.id}
  `;
  await deleteCmsDraft(pageDraftKey(page.id));
  await addRevision(page.id, user.id, { kind: "page", locale: "tr", status: "archived" });
  refreshCmsPage(page.id, page.slug);
  redirect("/icerik/sayfalar?arsiv=1");
}
