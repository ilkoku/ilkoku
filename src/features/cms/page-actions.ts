"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager, requireCmsPublisher } from "@/lib/cms-access";
import {
  cmsPageBlockImageUrls,
  cmsPageBlocksToPlainText,
  parseCmsPageBlocksJson,
  type CmsPageBlock,
} from "@/lib/cms-page-blocks";
import { deleteCmsDraft, getCmsDraftState, pageDraftKey, saveCmsDraft } from "@/lib/cms-drafts";
import { evaluateCmsPagePublishQuality } from "@/lib/cms-page-quality";
import { cmsPageContentKey, cmsPagePublicPath, normalizeCmsPageSlug } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";

type ExistingPage = {
  id: string;
  contentKey: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

type MediaRow = { valueJson: string };

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

async function requirePublishedBlockMedia(blocks: readonly CmsPageBlock[]) {
  const requested = cmsPageBlockImageUrls(blocks);
  if (requested.length === 0) return;
  const rows = await prisma.$queryRaw<MediaRow[]>`
    SELECT valueJson
    FROM SiteContent
    WHERE namespace = 'media' AND status = 'published'
    ORDER BY updatedAt DESC
    LIMIT 600
  `;
  const allowed = new Set<string>();
  for (const row of rows) {
    try {
      const value = JSON.parse(row.valueJson) as Record<string, unknown>;
      if (value.kind === "image" && typeof value.url === "string" && value.url.startsWith("/api/media/")) allowed.add(value.url);
    } catch {
      // Invalid media records are ignored instead of widening the allow-list.
    }
  }
  if (requested.some((url) => !allowed.has(url))) throw new Error("Sayfa bloğunda yayınlanmamış medya kullanılamaz.");
}

function refreshCmsPage(id?: string, slug?: string) {
  revalidatePath("/icerik");
  revalidatePath("/icerik/sayfalar");
  revalidatePath("/icerik/yayin-kuyrugu");
  revalidatePath("/icerik/saglik");
  revalidatePath("/icerik/gecmis");
  if (id) {
    revalidatePath(`/icerik/sayfalar/${id}`);
    revalidatePath(`/icerik/sayfalar/${id}/tasarla`);
    revalidatePath(`/icerik/onizleme/sayfa/${id}`);
  }
  if (slug) revalidatePath(slug);
  revalidatePath("/sitemap.xml");
}

function savedPageTarget(id: string, visual: boolean, suffix: string) {
  return visual ? `/icerik/sayfalar/${id}/tasarla${suffix}` : `/icerik/sayfalar/${id}${suffix}`;
}

export async function saveCmsPageAction(formData: FormData) {
  const requestedMode = String(formData.get("mode") ?? "draft");
  let access = await requireCmsManager("/icerik/sayfalar");
  if (requestedMode === "publish") access = await requireCmsPublisher("/icerik/sayfalar");
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

  const blocksRaw = String(formData.get("blocksJson") ?? "").trim();
  let blocks: CmsPageBlock[] = [];
  if (blocksRaw) {
    try {
      blocks = parseCmsPageBlocksJson(blocksRaw);
      await requirePublishedBlockMedia(blocks);
    } catch {
      redirect(existing ? `/icerik/sayfalar/${existing.id}/tasarla?hata=blok` : "/icerik/sayfalar/sablonlar?hata=blok");
    }
  }

  const title = String(formData.get("title") ?? "").trim().slice(0, 220);
  const summary = String(formData.get("summary") ?? "").trim().slice(0, 500);
  const submittedBody = String(formData.get("body") ?? "").trim();
  const body = blocks.length > 0 ? cmsPageBlocksToPlainText(blocks) : submittedBody;
  const seoTitle = String(formData.get("seoTitle") ?? "").trim().slice(0, 220);
  const seoDescription = String(formData.get("seoDescription") ?? "").trim().slice(0, 500);
  const noIndex = formData.get("noIndex") === "on";
  if (!title || !body) redirect("/icerik/sayfalar?hata=zorunlu");

  const fullSlug = existing?.slug ?? cmsPagePublicPath(slugPart);
  const contentKey = existing?.contentKey ?? cmsPageContentKey(slugPart);
  const publishQuality = evaluateCmsPagePublishQuality({
    slug: fullSlug,
    title,
    summary,
    body,
    seoTitle,
    seoDescription,
    noIndex,
  });
  const publishBlocked = requestedMode === "publish" && !publishQuality.ok;
  const mode = publishBlocked ? "draft" : requestedMode;
  const visual = blocks.length > 0;
  const snapshot = {
    kind: "page",
    locale: "tr",
    title,
    summary,
    body,
    ...(visual ? { blocks } : {}),
    seoTitle,
    seoDescription,
    noIndex,
    status: mode === "publish" ? "published" : "draft",
  };

  if (existing?.status === "published" && mode !== "publish") {
    await saveCmsDraft(user.id, pageDraftKey(existing.id), snapshot);
    await addRevision(existing.id, user.id, snapshot);
    refreshCmsPage(existing.id, existing.slug);
    redirect(savedPageTarget(existing.id, visual, publishBlocked ? "?hata=kalite" : "?taslak=1"));
  }

  const status = mode === "publish" ? "published" : "draft";
  const bodyJson = JSON.stringify({ summary, body, ...(visual ? { blocks } : {}) });

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
    redirect(savedPageTarget(id, visual, publishBlocked ? "?hata=kalite" : "?kayit=1"));
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
  redirect(savedPageTarget(existing.id, visual, publishBlocked ? "?hata=kalite" : "?kayit=1"));
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
