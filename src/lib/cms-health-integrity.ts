import "server-only";

import { parseFooterNavigation, FOOTER_DRAFT_KEY, FOOTER_LIVE_KEY } from "@/lib/cms-footer-navigation";
import {
  isCmsContentPagePayloadStrict,
  isCmsStagedPayloadStrict,
  parseCmsFaqPayloadStrict,
  parseCmsHomepageSectionStrict,
} from "@/lib/cms-live-payload-integrity";
import { parseCmsMediaAssetMetadata, parseStoredMediaBlob } from "@/lib/cms-media";
import { parseCmsRedirectValue } from "@/lib/cms-redirects";
import { isValidCmsRevisionSnapshotJson } from "@/lib/cms-revisions";
import { parseCmsSettingsStrict } from "@/lib/cms-settings";
import { prisma } from "@/lib/prisma";

type JsonRow = { contentKey: string; valueJson: string; status: string };
type RevisionJsonRow = { snapshotJson: string };
type PagePayloadRow = { contentKey: string; bodyJson: string };

function parseObject(valueJson: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function isObjectJson(valueJson: string) {
  return Boolean(parseObject(valueJson));
}

export type CmsOperationalIntegrity = {
  invalidRedirects: number;
  invalidMedia: number;
  invalidMediaBlobs: number;
  brokenDatabaseMedia: number;
  orphanMediaBlobs: number;
  invalidRevisions: number;
  invalidForms: number;
  overviewSanitizedWarnings: number;
  invalidAnnouncements: number;
  invalidFooterLive: number;
  invalidFooterDraft: number;
  invalidSettings: number;
  invalidStagedDrafts: number;
  invalidPublishedHomepage: number;
  invalidPublishedFaqs: number;
  invalidPublishedPages: number;
};

export async function getCmsOperationalIntegrity(): Promise<CmsOperationalIntegrity> {
  const [
    redirectRows,
    mediaRows,
    mediaBlobRows,
    revisionRows,
    formRows,
    announcementRows,
    footerRows,
    settingsRows,
    stagedDraftRows,
    homepageRows,
    faqRows,
    pageRows,
  ] = await Promise.all([
    prisma.$queryRaw<JsonRow[]>`SELECT contentKey, valueJson, status FROM SiteContent WHERE namespace = 'redirect' AND status = 'published'`,
    prisma.$queryRaw<JsonRow[]>`SELECT contentKey, valueJson, status FROM SiteContent WHERE namespace = 'media' AND status <> 'archived'`,
    prisma.$queryRaw<JsonRow[]>`SELECT contentKey, valueJson, status FROM SiteContent WHERE namespace = 'media_blob' AND status = 'published'`,
    prisma.$queryRaw<RevisionJsonRow[]>`SELECT snapshotJson FROM ContentRevision`,
    prisma.$queryRaw<JsonRow[]>`SELECT contentKey, valueJson, status FROM SiteContent WHERE namespace = 'form_submission'`,
    prisma.$queryRaw<JsonRow[]>`SELECT contentKey, valueJson, status FROM SiteContent WHERE namespace = 'announcement'`,
    prisma.$queryRaw<JsonRow[]>`
      SELECT contentKey, valueJson, status FROM SiteContent
      WHERE namespace = 'site' AND contentKey IN (${FOOTER_LIVE_KEY}, ${FOOTER_DRAFT_KEY})
    `,
    prisma.$queryRaw<JsonRow[]>`
      SELECT contentKey, valueJson, status FROM SiteContent
      WHERE namespace = 'cms_settings' AND contentKey = 'global' LIMIT 1
    `,
    prisma.$queryRaw<JsonRow[]>`SELECT contentKey, valueJson, status FROM SiteContent WHERE namespace = 'cms_draft' AND status = 'draft'`,
    prisma.$queryRaw<JsonRow[]>`
      SELECT contentKey, valueJson, status FROM SiteContent
      WHERE namespace = 'homepage' AND status = 'published'
        AND contentKey IN ('hero', 'roles', 'passport', 'why', 'history', 'footer')
    `,
    prisma.$queryRaw<JsonRow[]>`SELECT contentKey, valueJson, status FROM SiteContent WHERE namespace = 'faq' AND status = 'published'`,
    prisma.$queryRaw<PagePayloadRow[]>`
      SELECT contentKey, bodyJson FROM ContentPage
      WHERE status = 'published'
        AND (
          (contentKey LIKE 'legal:%' AND contentKey NOT LIKE 'legal:en:%')
          OR (contentKey LIKE 'guide:%' AND contentKey NOT LIKE 'guide:en:%')
          OR contentKey LIKE 'page:tr:%'
        )
    `,
  ]);

  const liveFooter = footerRows.find((row) => row.contentKey === FOOTER_LIVE_KEY && row.status === "published");
  const draftFooter = footerRows.find((row) => row.contentKey === FOOTER_DRAFT_KEY && row.status === "draft");
  const settings = settingsRows[0];

  const parsedMedia = mediaRows.map((row) => ({ row, asset: parseCmsMediaAssetMetadata(row.valueJson) }));
  const parsedBlobs = mediaBlobRows.map((row) => ({ row, blob: parseStoredMediaBlob(row.valueJson) }));
  const blobByKey = new Map(parsedBlobs.filter((item) => item.blob).map((item) => [item.row.contentKey, item.blob!]));
  const activeMediaKeys = new Set(mediaRows.map((row) => row.contentKey));

  const brokenDatabaseMedia = parsedMedia.filter(({ row, asset }) => {
    if (!asset || asset.storage !== "database") return false;
    if (!row.contentKey.startsWith("asset_")) return true;
    const id = row.contentKey.slice("asset_".length);
    if (!id || asset.id !== id || asset.url !== `/api/media/${id}`) return true;
    const blob = blobByKey.get(`blob_${id}`);
    return !blob || blob.id !== id;
  }).length;

  const orphanMediaBlobs = parsedBlobs.filter(({ row }) => {
    if (!row.contentKey.startsWith("blob_")) return true;
    const id = row.contentKey.slice("blob_".length);
    return !activeMediaKeys.has(`asset_${id}`);
  }).length;

  const invalidForms = formRows.filter((row) => !isObjectJson(row.valueJson)).length;

  return {
    invalidRedirects: redirectRows.filter((row) => !parseCmsRedirectValue(row.valueJson)).length,
    invalidMedia: parsedMedia.filter((item) => !item.asset).length,
    invalidMediaBlobs: parsedBlobs.filter((item) => !item.blob).length,
    brokenDatabaseMedia,
    orphanMediaBlobs,
    invalidRevisions: revisionRows.filter((row) => !isValidCmsRevisionSnapshotJson(row.snapshotJson)).length,
    invalidForms,
    overviewSanitizedWarnings: invalidForms,
    invalidAnnouncements: announcementRows.filter((row) => !isObjectJson(row.valueJson)).length,
    invalidFooterLive: liveFooter && !parseFooterNavigation(liveFooter.valueJson) ? 1 : 0,
    invalidFooterDraft: draftFooter && !parseFooterNavigation(draftFooter.valueJson) ? 1 : 0,
    invalidSettings: settings && !parseCmsSettingsStrict(settings.valueJson) ? 1 : 0,
    invalidStagedDrafts: stagedDraftRows.filter((row) => {
      const payload = parseObject(row.valueJson);
      return !payload || !isCmsStagedPayloadStrict(row.contentKey, payload);
    }).length,
    invalidPublishedHomepage: homepageRows.filter((row) => !parseCmsHomepageSectionStrict(row.contentKey, row.valueJson)).length,
    invalidPublishedFaqs: faqRows.filter((row) => !parseCmsFaqPayloadStrict(row.valueJson)).length,
    invalidPublishedPages: pageRows.filter((row) => !isCmsContentPagePayloadStrict(row.contentKey, row.bodyJson)).length,
  };
}
