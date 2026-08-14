"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsPublisher } from "@/lib/cms-access";
import { cmsLegalDocuments } from "@/lib/cms-legal";
import { legalPages, legalPageToCmsBody } from "@/lib/legal-public-content";
import { prisma } from "@/lib/prisma";

type ExistingPage = { id: string; status: string };

export async function adoptPublicLegalPagesAction() {
  const access = await requireCmsPublisher("/icerik/yasal");
  const currentUser = access.user!;
  let created = 0;
  let skipped = 0;

  for (const document of cmsLegalDocuments) {
    const existing = await prisma.$queryRaw<ExistingPage[]>`
      SELECT id, status FROM ContentPage
      WHERE contentKey = ${document.key}
      LIMIT 1
    `;

    if (existing[0]) {
      skipped += 1;
      continue;
    }

    const source = legalPages[document.slug];
    if (!source) {
      skipped += 1;
      continue;
    }

    const pageId = randomUUID();
    const path = `/yasal/${document.slug}`;
    const body = legalPageToCmsBody(source);
    const bodyJson = JSON.stringify({
      description: source.description,
      updatedLabel: source.updatedAt,
      body,
    });

    await prisma.$executeRaw`
      INSERT INTO ContentPage (
        id, contentKey, slug, title, status, bodyJson,
        seoTitle, seoDescription, canonicalUrl, noIndex, publishedAt,
        createdById, updatedById, createdAt, updatedAt
      ) VALUES (
        ${pageId}, ${document.key}, ${path}, ${source.title}, 'published', ${bodyJson},
        ${source.title}, ${source.description}, ${path}, false, CURRENT_TIMESTAMP(3),
        ${currentUser.id}, ${currentUser.id}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
    `;

    const snapshot = JSON.stringify({
      kind: "legal",
      locale: "tr",
      source: "public-fallback-adoption",
      title: source.title,
      description: source.description,
      updatedLabel: source.updatedAt,
      body,
      status: "published",
    });

    await prisma.$executeRaw`
      INSERT INTO ContentRevision (
        id, pageId, version, snapshotJson, createdById, createdAt
      ) VALUES (
        ${randomUUID()}, ${pageId}, 1, ${snapshot}, ${currentUser.id}, CURRENT_TIMESTAMP(3)
      )
    `;

    created += 1;
    revalidatePath(path);
  }

  revalidatePath("/icerik");
  revalidatePath("/icerik/yasal");
  revalidatePath("/icerik/saglik");
  revalidatePath("/icerik/gecmis");
  redirect(`/icerik/yasal?dil=tr&devralindi=${created}&atlandi=${skipped}`);
}
