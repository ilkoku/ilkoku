import "server-only";

import { parseFooterNavigation, FOOTER_DRAFT_KEY, FOOTER_LIVE_KEY } from "@/lib/cms-footer-navigation";
import { parseCmsMediaAssetMetadata } from "@/lib/cms-media";
import { parseCmsRedirectValue } from "@/lib/cms-redirects";
import { isValidCmsRevisionSnapshotJson } from "@/lib/cms-revisions";
import { parseCmsSettingsStrict } from "@/lib/cms-settings";
import { prisma } from "@/lib/prisma";

type JsonRow = { contentKey: string; valueJson: string; status: string };
type RevisionJsonRow = { snapshotJson: string };

function isObjectJson(valueJson: string) {
  try {
    const value = JSON.parse(valueJson) as unknown;
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  } catch {
    return false;
  }
}

export type CmsOperationalIntegrity = {
  invalidRedirects: number;
  invalidMedia: number;
  invalidRevisions: number;
  invalidForms: number;
  invalidAnnouncements: number;
  invalidFooterLive: number;
  invalidFooterDraft: number;
  invalidSettings: number;
};

export async function getCmsOperationalIntegrity(): Promise<CmsOperationalIntegrity> {
  const [redirectRows, mediaRows, revisionRows, formRows, announcementRows, footerRows, settingsRows] = await Promise.all([
    prisma.$queryRaw<JsonRow[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = 'redirect' AND status = 'published'
    `,
    prisma.$queryRaw<JsonRow[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = 'media' AND status <> 'archived'
    `,
    prisma.$queryRaw<RevisionJsonRow[]>`
      SELECT snapshotJson
      FROM ContentRevision
    `,
    prisma.$queryRaw<JsonRow[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = 'form_submission'
    `,
    prisma.$queryRaw<JsonRow[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = 'announcement'
    `,
    prisma.$queryRaw<JsonRow[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = 'site'
        AND contentKey IN (${FOOTER_LIVE_KEY}, ${FOOTER_DRAFT_KEY})
    `,
    prisma.$queryRaw<JsonRow[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = 'cms_settings' AND contentKey = 'global'
      LIMIT 1
    `,
  ]);

  const liveFooter = footerRows.find((row) => row.contentKey === FOOTER_LIVE_KEY && row.status === "published");
  const draftFooter = footerRows.find((row) => row.contentKey === FOOTER_DRAFT_KEY && row.status === "draft");
  const settings = settingsRows[0];

  return {
    invalidRedirects: redirectRows.filter((row) => !parseCmsRedirectValue(row.valueJson)).length,
    invalidMedia: mediaRows.filter((row) => !parseCmsMediaAssetMetadata(row.valueJson)).length,
    invalidRevisions: revisionRows.filter((row) => !isValidCmsRevisionSnapshotJson(row.snapshotJson)).length,
    invalidForms: formRows.filter((row) => !isObjectJson(row.valueJson)).length,
    invalidAnnouncements: announcementRows.filter((row) => !isObjectJson(row.valueJson)).length,
    invalidFooterLive: liveFooter && !parseFooterNavigation(liveFooter.valueJson) ? 1 : 0,
    invalidFooterDraft: draftFooter && !parseFooterNavigation(draftFooter.valueJson) ? 1 : 0,
    invalidSettings: settings && !parseCmsSettingsStrict(settings.valueJson) ? 1 : 0,
  };
}
