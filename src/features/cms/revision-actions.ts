"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsPublisher } from "@/lib/cms-access";
import { CMS_DRAFT_NAMESPACE, pageDraftKey } from "@/lib/cms-drafts";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import {
  cmsRevisionKind,
  cmsRevisionLocale,
  isRestorableCmsRevision,
  parseCmsRevisionSnapshot,
  type CmsRevisionSnapshot,
  type CmsRevisionStatus,
} from "@/lib/cms-revisions";
import { prisma } from "@/lib/prisma";

type RevisionRow = {
  id: string;
  pageId: string;
  version: number;
  snapshotJson: string;
};

type PageRow = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: CmsRevisionStatus;
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  noIndex: boolean;
};

function parseObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function currentFullSnapshot(page: PageRow): CmsRevisionSnapshot {
  const kind = cmsRevisionKind(page.contentKey);
  const body = parseObject(page.bodyJson);
  const locale = page.contentKey.includes(":en:") ? "en" : "tr";

  if (kind === "legal") {
    return {
      locale,
      title: page.title,
      description: typeof body.description === "string" ? body.description : "",
      updatedLabel: typeof body.updatedLabel === "string" ? body.updatedLabel : "",
      body: typeof body.body === "string" ? body.body : "",
      status: page.status,
    };
  }

  if (kind === "guide" || kind === "page") {
    return {
      locale,
      title: page.title,
      summary: typeof body.summary === "string" ? body.summary : "",
      body: typeof body.body === "string" ? body.body : "",
      seoTitle: page.seoTitle ?? "",
      seoDescription: page.seoDescription ?? "",
      noIndex: page.noIndex,
      status: page.status,
    };
  }

  return { locale, title: page.title, status: page.status };
}

export async function restoreCmsRevisionAction(formData: FormData) {
  const access = await requireCmsPublisher("/icerik/gecmis");
  const user = access.user!;
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  if (!revisionId) redirect("/icerik/gecmis?hata=surum");

  const revisions = await prisma.$queryRaw<RevisionRow[]>`
    SELECT id, pageId, version, snapshotJson
    FROM ContentRevision
    WHERE id = ${revisionId}
    LIMIT 1
  `;
  const revision = revisions[0];
  if (!revision) redirect("/icerik/gecmis?hata=surum");

  const pages = await prisma.$queryRaw<PageRow[]>`
    SELECT id, contentKey, slug, title, status, bodyJson,
           seoTitle, seoDescription, noIndex
    FROM ContentPage
    WHERE id = ${revision.pageId}
    LIMIT 1
  `;
  const page = pages[0];
  if (!page) redirect("/icerik/gecmis?hata=sayfa");

  const snapshot = parseCmsRevisionSnapshot(revision.snapshotJson);
  if (!isRestorableCmsRevision(page.contentKey, snapshot)) {
    redirect(`/icerik/gecmis/${revision.id}?hata=geri-yuklenemez`);
  }

  const locale = cmsRevisionLocale(page.contentKey, snapshot);
  if (snapshot.status === "published" && !(await isCmsLocaleEnabled(locale))) {
    redirect(`/icerik/gecmis/${revision.id}?hata=dil-pasif`);
  }

  const kind = cmsRevisionKind(page.contentKey);
  const backupSnapshot = currentFullSnapshot(page);
  if (!isRestorableCmsRevision(page.contentKey, backupSnapshot)) {
    redirect(`/icerik/gecmis/${revision.id}?hata=mevcut-yedek`);
  }

  const backupId = randomUUID();
  const restoredId = randomUUID();
  const draftKey = pageDraftKey(page.id);
  const restoreIntoWorkingDraft = page.status === "published" && snapshot.status === "draft";

  await prisma.$transaction(async (tx) => {
    const versions = await tx.$queryRaw<Array<{ version: number | bigint }>>`
      SELECT COALESCE(MAX(version), 0) AS version
      FROM ContentRevision
      WHERE pageId = ${page.id}
    `;
    const currentVersion = Number(versions[0]?.version ?? 0);
    const backupVersion = currentVersion + 1;
    const restoredVersion = currentVersion + 2;

    const backup = JSON.stringify({
      ...backupSnapshot,
      _meta: { action: "backup-before-restore", backupBeforeRestore: true },
    });

    await tx.$executeRaw`
      INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
      VALUES (${backupId}, ${page.id}, ${backupVersion}, ${backup}, ${user.id}, CURRENT_TIMESTAMP(3))
    `;

    if (restoreIntoWorkingDraft) {
      const draftJson = JSON.stringify(snapshot);
      await tx.$executeRaw`
        INSERT INTO SiteContent (
          id, namespace, contentKey, valueJson, valueType, status,
          updatedById, createdAt, updatedAt
        ) VALUES (
          ${randomUUID()}, ${CMS_DRAFT_NAMESPACE}, ${draftKey}, ${draftJson}, 'json', 'draft',
          ${user.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
        )
        ON DUPLICATE KEY UPDATE
          valueJson = VALUES(valueJson),
          status = 'draft',
          publishedAt = NULL,
          updatedById = VALUES(updatedById),
          updatedAt = CURRENT_TIMESTAMP(3)
      `;
    } else if (kind === "legal") {
      const description = typeof snapshot.description === "string" ? snapshot.description : "";
      const updatedLabel = typeof snapshot.updatedLabel === "string" ? snapshot.updatedLabel : "";
      const body = String(snapshot.body ?? "");
      const bodyJson = JSON.stringify({ description, updatedLabel, body });
      await tx.$executeRaw`
        UPDATE ContentPage
        SET title = ${String(snapshot.title)}, status = ${snapshot.status!}, bodyJson = ${bodyJson},
            seoDescription = ${description || null}, publishedAt = ${snapshot.status === "published" ? new Date() : null},
            updatedById = ${user.id}, updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${page.id}
      `;
    } else if (kind === "guide" || kind === "page") {
      const summary = typeof snapshot.summary === "string" ? snapshot.summary : "";
      const body = String(snapshot.body ?? "");
      const seoTitle = typeof snapshot.seoTitle === "string" ? snapshot.seoTitle : "";
      const seoDescription = typeof snapshot.seoDescription === "string" ? snapshot.seoDescription : "";
      const noIndex = snapshot.noIndex === true;
      const bodyJson = JSON.stringify({ summary, body });
      await tx.$executeRaw`
        UPDATE ContentPage
        SET title = ${String(snapshot.title)}, status = ${snapshot.status!}, bodyJson = ${bodyJson},
            seoTitle = ${seoTitle || null}, seoDescription = ${seoDescription || summary || null}, noIndex = ${noIndex},
            publishedAt = ${snapshot.status === "published" ? new Date() : null},
            updatedById = ${user.id}, updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${page.id}
      `;
    }

    if (!restoreIntoWorkingDraft && snapshot.status === "published") {
      await tx.$executeRaw`
        DELETE FROM SiteContent
        WHERE namespace = ${CMS_DRAFT_NAMESPACE}
          AND contentKey = ${draftKey}
      `;
    }

    const restored = JSON.stringify({
      ...snapshot,
      _meta: {
        action: restoreIntoWorkingDraft ? "restore-to-working-draft" : "restore",
        restoredFromVersion: revision.version,
      },
    });

    await tx.$executeRaw`
      INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
      VALUES (${restoredId}, ${page.id}, ${restoredVersion}, ${restored}, ${user.id}, CURRENT_TIMESTAMP(3))
    `;
  });

  revalidatePath("/icerik");
  revalidatePath("/icerik/gecmis");
  revalidatePath(`/icerik/gecmis/${revision.id}`);

  if (kind === "legal") {
    revalidatePath("/icerik/yasal");
    revalidatePath(`/icerik/onizleme/yasal/${page.slug.split("/").filter(Boolean).at(-1) ?? ""}`);
    if (!restoreIntoWorkingDraft && locale === "tr") revalidatePath(page.slug);
  }
  if (kind === "guide") {
    revalidatePath("/icerik/rehber");
    revalidatePath(`/icerik/rehber/${page.id}`);
    revalidatePath(`/icerik/onizleme/rehber/${page.id}`);
    if (!restoreIntoWorkingDraft && locale === "tr") {
      revalidatePath("/rehber");
      revalidatePath(page.slug);
    }
  }
  if (kind === "page") {
    revalidatePath("/icerik/sayfalar");
    revalidatePath(`/icerik/sayfalar/${page.id}`);
    revalidatePath(`/icerik/onizleme/sayfa/${page.id}`);
    if (!restoreIntoWorkingDraft && locale === "tr") revalidatePath(page.slug);
    revalidatePath("/sitemap.xml");
  }

  redirect(`/icerik/gecmis/${restoredId}?geri-yuklendi=1${restoreIntoWorkingDraft ? "&taslak=1" : ""}`);
}
