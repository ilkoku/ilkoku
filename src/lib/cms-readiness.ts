import "server-only";
import { prisma } from "@/lib/prisma";

export const cmsReadinessTargets = {
  homepage: 5,
  legal: 5,
  corporate: 1,
  faq: 4,
  guides: 1,
} as const;

export const cmsReadinessRequiredContent = {
  corporate: "page:tr:hakkimizda",
  guide: "guide:ilkoku-nasil-calisir",
  faq: [
    "item_starter_ilkoku_nedir",
    "item_starter_yazar_yayin",
    "item_starter_editor_inceleme",
    "item_starter_yayinevi_kesif",
  ],
} as const;

export const cmsStarterTargets = {
  corporate: 1,
  faq: 4,
  guides: 1,
  total: 6,
  seo: 2,
} as const;

export type CmsReadinessSnapshot = {
  homepage: number;
  legal: number;
  corporate: number;
  corporateCreated: number;
  corporateArchived: number;
  corporateSeoReady: number;
  faq: number;
  faqCreated: number;
  faqArchived: number;
  guides: number;
  guidesCreated: number;
  guidesArchived: number;
  guidesSeoReady: number;
  media: number;
  seoMissing: number;
  queue: number;
};

type ReadinessRow = {
  homepage: bigint | number;
  legal: bigint | number;
  corporate: bigint | number;
  corporateCreated: bigint | number;
  corporateArchived: bigint | number;
  corporateSeoReady: bigint | number;
  faq: bigint | number;
  faqCreated: bigint | number;
  faqArchived: bigint | number;
  guides: bigint | number;
  guidesCreated: bigint | number;
  guidesArchived: bigint | number;
  guidesSeoReady: bigint | number;
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
          AND contentKey = 'page:tr:hakkimizda'
          AND noIndex = false) AS corporate,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status IN ('draft', 'published')
          AND contentKey = 'page:tr:hakkimizda') AS corporateCreated,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status = 'archived'
          AND contentKey = 'page:tr:hakkimizda') AS corporateArchived,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status IN ('draft', 'published')
          AND contentKey = 'page:tr:hakkimizda'
          AND noIndex = false
          AND COALESCE(TRIM(seoTitle), '') <> ''
          AND COALESCE(TRIM(seoDescription), '') <> ''
          AND COALESCE(TRIM(canonicalUrl), '') <> '') AS corporateSeoReady,
      (SELECT COUNT(*) FROM SiteContent
        WHERE namespace = 'faq'
          AND status = 'published'
          AND contentKey IN (
            'item_starter_ilkoku_nedir',
            'item_starter_yazar_yayin',
            'item_starter_editor_inceleme',
            'item_starter_yayinevi_kesif'
          )) AS faq,
      (SELECT COUNT(*) FROM SiteContent
        WHERE namespace = 'faq'
          AND status IN ('draft', 'published')
          AND contentKey IN (
            'item_starter_ilkoku_nedir',
            'item_starter_yazar_yayin',
            'item_starter_editor_inceleme',
            'item_starter_yayinevi_kesif'
          )) AS faqCreated,
      (SELECT COUNT(*) FROM SiteContent
        WHERE namespace = 'faq'
          AND status = 'archived'
          AND contentKey IN (
            'item_starter_ilkoku_nedir',
            'item_starter_yazar_yayin',
            'item_starter_editor_inceleme',
            'item_starter_yayinevi_kesif'
          )) AS faqArchived,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status = 'published'
          AND contentKey = 'guide:ilkoku-nasil-calisir'
          AND noIndex = false) AS guides,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status IN ('draft', 'published')
          AND contentKey = 'guide:ilkoku-nasil-calisir') AS guidesCreated,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status = 'archived'
          AND contentKey = 'guide:ilkoku-nasil-calisir') AS guidesArchived,
      (SELECT COUNT(*) FROM ContentPage
        WHERE status IN ('draft', 'published')
          AND contentKey = 'guide:ilkoku-nasil-calisir'
          AND noIndex = false
          AND COALESCE(TRIM(seoTitle), '') <> ''
          AND COALESCE(TRIM(seoDescription), '') <> ''
          AND COALESCE(TRIM(canonicalUrl), '') <> '') AS guidesSeoReady,
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
    corporateCreated: value(row?.corporateCreated),
    corporateArchived: value(row?.corporateArchived),
    corporateSeoReady: value(row?.corporateSeoReady),
    faq: value(row?.faq),
    faqCreated: value(row?.faqCreated),
    faqArchived: value(row?.faqArchived),
    guides: value(row?.guides),
    guidesCreated: value(row?.guidesCreated),
    guidesArchived: value(row?.guidesArchived),
    guidesSeoReady: value(row?.guidesSeoReady),
    media: value(row?.media),
    seoMissing: value(row?.seoMissing),
    queue: value(row?.queue),
  };
}

export function getCmsStarterSummary(data: CmsReadinessSnapshot) {
  const createdTotal = Math.min(data.corporateCreated, cmsStarterTargets.corporate)
    + Math.min(data.faqCreated, cmsStarterTargets.faq)
    + Math.min(data.guidesCreated, cmsStarterTargets.guides);
  const archivedTotal = Math.min(data.corporateArchived, cmsStarterTargets.corporate)
    + Math.min(data.faqArchived, cmsStarterTargets.faq)
    + Math.min(data.guidesArchived, cmsStarterTargets.guides);
  const accountedTotal = Math.min(createdTotal + archivedTotal, cmsStarterTargets.total);
  const publishedTotal = Math.min(data.corporate, cmsStarterTargets.corporate)
    + Math.min(data.faq, cmsStarterTargets.faq)
    + Math.min(data.guides, cmsStarterTargets.guides);
  const seoReady = Math.min(data.corporateSeoReady, cmsStarterTargets.corporate)
    + Math.min(data.guidesSeoReady, cmsStarterTargets.guides);

  return {
    createdTotal,
    archivedTotal,
    accountedTotal,
    missingTotal: Math.max(cmsStarterTargets.total - accountedTotal, 0),
    publishedTotal,
    total: cmsStarterTargets.total,
    seoReady,
    seoTotal: cmsStarterTargets.seo,
    complete: createdTotal >= cmsStarterTargets.total,
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
