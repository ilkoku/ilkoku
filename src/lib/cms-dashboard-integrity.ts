import type { CmsOperationalIntegrity } from "@/lib/cms-health-integrity";

export type CmsDashboardIntegritySignals = {
  blockers: number;
  warnings: number;
};

export function getCmsDashboardIntegritySignals(integrity: CmsOperationalIntegrity): CmsDashboardIntegritySignals {
  const blockers =
    integrity.invalidRedirects
    + integrity.brokenDatabaseMedia
    + integrity.invalidFooterLive
    + integrity.invalidSettings
    + integrity.invalidPublishedHomepage
    + integrity.invalidPublishedFaqs
    + integrity.invalidPublishedPages;

  const warnings =
    integrity.invalidMedia
    + integrity.invalidMediaBlobs
    + integrity.orphanMediaBlobs
    + integrity.invalidRevisions
    + integrity.invalidForms
    + integrity.invalidAnnouncements
    + integrity.invalidFooterDraft
    + integrity.invalidStagedDrafts;

  return { blockers, warnings };
}
