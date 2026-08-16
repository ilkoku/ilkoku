import "server-only";

import { faqDraftKey, getCmsDraftState, homepageDraftKey, pageDraftKey } from "@/lib/cms-drafts";
import {
  isCmsContentPagePayloadStrict,
  isCmsStagedPayloadStrict,
  parseCmsFaqPayloadStrict,
  parseCmsHomepageSectionStrict,
} from "@/lib/cms-live-payload-integrity";
import { parseCmsSchedulePayload, type CmsSchedulePayload } from "@/lib/cms-scheduler";
import { prisma } from "@/lib/prisma";

type ActiveScheduleRow = { id: string; valueJson: string };
type SiteTargetRow = { id: string; namespace: string; contentKey: string; valueJson: string; status: string };
type PageTargetRow = { id: string; contentKey: string; bodyJson: string; status: string };

async function targetPublishPayloadValid(payload: CmsSchedulePayload) {
  if (!payload.publishAt || payload.publishedExecutedAt) return true;

  if (payload.targetType === "site_content") {
    const rows = await prisma.$queryRaw<SiteTargetRow[]>`
      SELECT id, namespace, contentKey, valueJson, status
      FROM SiteContent WHERE id = ${payload.targetId} LIMIT 1
    `;
    const target = rows[0];
    if (!target || target.status === "archived") return false;
    const draftKey = target.namespace === "homepage"
      ? homepageDraftKey("tr", target.contentKey)
      : target.namespace === "faq"
        ? faqDraftKey("tr", target.contentKey)
        : null;
    if (!draftKey) return false;
    const staged = await getCmsDraftState(draftKey);
    if (staged.state === "corrupt") return false;
    if (staged.state === "valid") return isCmsStagedPayloadStrict(draftKey, staged.record.payload);
    return target.namespace === "homepage"
      ? Boolean(parseCmsHomepageSectionStrict(target.contentKey, target.valueJson))
      : Boolean(parseCmsFaqPayloadStrict(target.valueJson));
  }

  const rows = await prisma.$queryRaw<PageTargetRow[]>`
    SELECT id, contentKey, bodyJson, status
    FROM ContentPage WHERE id = ${payload.targetId} LIMIT 1
  `;
  const target = rows[0];
  if (!target || target.status === "archived") return false;
  const draftKey = pageDraftKey(target.id);
  const staged = await getCmsDraftState(draftKey);
  if (staged.state === "corrupt") return false;
  if (staged.state === "valid") return isCmsStagedPayloadStrict(draftKey, staged.record.payload);
  return isCmsContentPagePayloadStrict(target.contentKey, target.bodyJson);
}

export async function quarantineMalformedActiveSchedules() {
  const rows = await prisma.$queryRaw<ActiveScheduleRow[]>`
    SELECT id, valueJson
    FROM SiteContent
    WHERE namespace = 'cms_schedule'
      AND status = 'published'
    ORDER BY createdAt ASC
    LIMIT 500
  `;

  let quarantined = 0;
  for (const row of rows) {
    const payload = parseCmsSchedulePayload(row.valueJson);
    if (!payload) {
      await prisma.$executeRaw`
        UPDATE SiteContent
        SET status = 'archived', updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${row.id} AND namespace = 'cms_schedule' AND status = 'published'
      `;
      quarantined += 1;
      continue;
    }

    if (!(await targetPublishPayloadValid(payload))) {
      payload.state = "failed";
      payload.failedAt = new Date().toISOString();
      payload.failureCode = "TARGET_PAYLOAD_INVALID";
      await prisma.$executeRaw`
        UPDATE SiteContent
        SET valueJson = ${JSON.stringify(payload)}, status = 'archived', updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${row.id} AND namespace = 'cms_schedule' AND status = 'published'
      `;
      quarantined += 1;
    }
  }

  return { scanned: rows.length, quarantined };
}
