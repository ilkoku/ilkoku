import "server-only";
import { prisma } from "@/lib/prisma";

export const cmsReadinessTargets = {
  homepage: 5,
  legal: 5,
  corporate: 1,
  faq: 4,
  guides: 1,
} as const;

export type CmsReadinessSnapshot = {
  homepage: number;
  legal: number;
  corporate: number;
  faq: number;
  guides: number;
  media: number;
  seoMissing: number;
  queue: number;
};

type ReadinessRow = {
  homepage: bigint | number;
  legal: bigint | number;
  corporate: bigint | number;
  faq: bigint | number;
  guides: bigint | number;
  media: bigint | number;
  seoMissing: bigint | number;
  queue: bigint | number;
};

function value(input: bigint | number | null | undefined) {
  return Number(input ?? 0);
}

export async function loadCmsReadiness(): Promise<CmsReadinessSnapshot> {
  const rows = await prisma.$queryRaw<ReadinessRow[]>`
    SELECT
      (SELECT COUNT(*) FROM SiteContent
        WHERE namespace = 'homepage'
          AND status = 'published'
          AND contentKey IN ('hero', 'roles', 'passport', 'why', 'footer')) AS homepage,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status = 'published'
          AND contentKey IN (
            'legal:kullanim-sartlari',
            'legal:gizlilik-politikasi',
            'legal:kvkk',
            'legal:cerez-politikasi',
            'legal:telif-hakki-politikasi'
          )) AS legal,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status = 'published'
          AND contentKey LIKE 'page:tr:%'
          AND noIndex = false) AS corporate,
      (SELECT COUNT(*) FROM SiteContent
        WHERE namespace = 'faq'
          AND status = 'published') AS faq,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status = 'published'
          AND contentKey LIKE 'guide:%'
          AND contentKey NOT LIKE 'guide:en:%'
          AND noIndex = false) AS guides,
      (SELECT COUNT(*) FROM SiteContent
        WHERE namespace = 'media'
          AND status <> 'archived') AS media,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status = 'published'
          AND contentKey NOT LIKE 'legal:en:%'
          AND contentKey NOT LIKE 'guide:en:%'
          AND contentKey NOT LIKE 'page:en:%'
          AND (
            COALESCE(TRIM(seoTitle), '') = ''
            OR COALESCE(TRIM(seoDescription), '') = ''
            OR COALESCE(TRIM(canonicalUrl), '') = ''
          )) AS seoMissing,
      (
        (SELECT COUNT(*) FROM SiteContent
          WHERE namespace = 'cms_draft' AND status = 'draft')
        +
        (SELECT COUNT(*) FROM ContentPage
          WHERE status = 'draft'
            AND (
              contentKey LIKE 'legal:%'
              OR contentKey LIKE 'guide:%'
              OR contentKey LIKE 'page:tr:%'
              OR contentKey LIKE 'page:en:%'
            ))
        +
        (SELECT COUNT(*) FROM SiteContent
          WHERE namespace IN ('faq', 'faq_en') AND status = 'draft')
      ) AS queue
  `;

  const row = rows[0];
  return {
    homepage: value(row?.homepage),
    legal: value(row?.legal),
    corporate: value(row?.corporate),
    faq: value(row?.faq),
    guides: value(row?.guides),
    media: value(row?.media),
    seoMissing: value(row?.seoMissing),
    queue: value(row?.queue),
  };
}

export function getCmsReadinessSummary(data: CmsReadinessSnapshot) {
  const coreChecks = [
    data.homepage >= cmsReadinessTargets.homepage,
    data.legal >= cmsReadinessTargets.legal,
    data.corporate >= cmsReadinessTargets.corporate,
    data.faq >= cmsReadinessTargets.faq,
    data.guides >= cmsReadinessTargets.guides,
  ];

  const blockers = data.legal < cmsReadinessTargets.legal ? 1 : 0;
  const warnings = [
    data.homepage < cmsReadinessTargets.homepage,
    data.corporate < cmsReadinessTargets.corporate,
    data.faq < cmsReadinessTargets.faq,
    data.guides < cmsReadinessTargets.guides,
    data.seoMissing > 0,
    data.queue > 0,
  ].filter(Boolean).length;

  return {
    corePassed: coreChecks.filter(Boolean).length,
    coreTotal: coreChecks.length,
    blockers,
    warnings,
    ready: blockers === 0 && warnings === 0,
  };
}
