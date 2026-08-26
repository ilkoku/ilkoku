import "server-only";

import { communityRulesPageContent } from "@/content/community-rules";
import { contentAgePolicyPageContent } from "@/content/content-age-policy";
import { copyrightNoticePageContent } from "@/content/copyright-notice";
import { editorialStandardsPageContent } from "@/content/editorial-standards";
import { forEditorsPageContent } from "@/content/for-editors";
import { forPublishersPageContent } from "@/content/for-publishers";
import { forWritersPageContent } from "@/content/for-writers";
import { howItWorksPageContent } from "@/content/how-it-works";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";

type PublicPageRow = {
  bodyJson: string;
  canonicalUrl: string | null;
  noIndex: boolean;
  seoDescription: string | null;
  seoTitle: string | null;
  title: string;
  updatedAt: Date;
};

export type PublishedCmsPublicPage = {
  body: string;
  canonicalUrl: string | null;
  noIndex: boolean;
  seoDescription: string | null;
  seoTitle: string | null;
  summary: string;
  title: string;
  updatedAt: Date;
};

export type PublishedCmsPublicPageState =
  | { state: "missing" }
  | { state: "valid"; page: PublishedCmsPublicPage }
  | { state: "corrupt"; updatedAt: Date }
  | { state: "unavailable" };

type BundledPublicTrustCopy = {
  body: string;
  canonical: string;
  seoDescription: string;
  seoTitle: string;
  summary: string;
  title: string;
  updatedAt: string;
};

type LegacyTrustCopyBridge = {
  bundled: BundledPublicTrustCopy;
  legacyMarkers: readonly string[];
};

const legacyTrustCopyBySlug: Partial<Record<string, LegacyTrustCopyBridge>> = {
  "nasil-calisir": {
    bundled: howItWorksPageContent,
    legacyMarkers: [
      "## İlkOku ne yapmaz?",
      "Bu sayfa bir tanıtım vaadi değil, platformun gerçek çalışma sınırlarını açıklar.",
    ],
  },
  "editoryal-standartlar": {
    bundled: editorialStandardsPageContent,
    legacyMarkers: [
      "Bu standartlar bir yayın kabulü, basım kararı, ticari başarı garantisi",
      "İlkOku'da editoryal değerlendirme; eseri övmek, yazarı yargılamak",
    ],
  },
  "icerik-ve-yas-politikasi": {
    bundled: contentAgePolicyPageContent,
    legacyMarkers: [
      "Yaş sınıfı bir kalite puanı, editör onayı, hukuki uygunluk kararı veya her okur için uygunluk garantisi değildir.",
      "İlkOku şu anda her eseri yayın öncesinde insan eliyle okumaz",
    ],
  },
  "topluluk-kurallari": {
    bundled: communityRulesPageContent,
    legacyMarkers: [
      "bu nedenle topluluk güveni yalnız ne söylendiğine değil, nasıl söylendiğine",
      "İlkOku bütün kullanıcı içeriklerini yayınlanmadan önce insan eliyle incelemeyi",
    ],
  },
  "telif-bildirimi": {
    bundled: copyrightNoticePageContent,
    legacyMarkers: [
      "İlkOku telif sahipliği hakkında mahkeme yerine geçen kesin bir hukuki karar vermez.",
      "Bildirim otomatik kaldırma emri değildir.",
    ],
  },
  "yazarlar-icin": {
    bundled: forWritersPageContent,
    legacyMarkers: [
      "Bu sayfa bir yayın veya başarı garantisi vermez.",
      "## İlkOku yazar için neyi garanti etmez",
    ],
  },
  "editorler-icin": {
    bundled: forEditorsPageContent,
    legacyMarkers: [
      "Bu sayfa editöre eser üzerinde yayınlama, çoğaltma, lisanslama veya ticari kullanım hakkı verildiği anlamına gelmez.",
      "Editörün görevi bir eseri kendi zevkine göre yeniden yazmak",
    ],
  },
  "yayinevleri-icin": {
    bundled: forPublishersPageContent,
    legacyMarkers: [
      "Bir eseri keşfetmek, beğenmek, favoriye almak, yazarı takip etmek veya ekip içinde paylaşmak;",
      "## İlkOku yayınevi için neyi garanti etmez",
    ],
  },
};

function getBundledCopyForLegacyCms(
  slugPart: string,
  cmsBody: string,
): BundledPublicTrustCopy | null {
  const bridge = legacyTrustCopyBySlug[slugPart];
  if (!bridge) return null;

  return bridge.legacyMarkers.some((marker) => cmsBody.includes(marker))
    ? bridge.bundled
    : null;
}

export async function getPublishedCmsPublicPageState(
  slugPart: string,
): Promise<PublishedCmsPublicPageState> {
  const contentKey = `page:tr:${slugPart}`;
  const slug = `/${slugPart}`;

  try {
    const rows = await prisma.$queryRaw<PublicPageRow[]>`
      SELECT title, bodyJson, seoTitle, seoDescription, canonicalUrl, noIndex, updatedAt
      FROM ContentPage
      WHERE contentKey = ${contentKey}
        AND slug = ${slug}
        AND status = 'published'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { state: "missing" };

    const parsed = parseCmsPageBody(row.bodyJson);
    const cmsBody = parsed.body.trim();
    if (!row.title.trim() || !cmsBody) {
      return { state: "corrupt", updatedAt: row.updatedAt };
    }

    // The eight public trust pages were already published in CMS before their
    // discovery-first rewrite. Keep CMS authoritative for all future edits,
    // but bridge only the unmistakable legacy copy so deploys do not continue
    // serving the superseded defensive text. Once an editor republishes copy
    // without a legacy marker, the CMS version takes control again automatically.
    const bundled = getBundledCopyForLegacyCms(slugPart, cmsBody);
    if (bundled) {
      return {
        state: "valid",
        page: {
          body: bundled.body,
          canonicalUrl: row.canonicalUrl || bundled.canonical,
          noIndex: row.noIndex,
          seoDescription: bundled.seoDescription,
          seoTitle: bundled.seoTitle,
          summary: bundled.summary,
          title: bundled.title,
          updatedAt: new Date(bundled.updatedAt),
        },
      };
    }

    return {
      state: "valid",
      page: {
        body: cmsBody,
        canonicalUrl: row.canonicalUrl,
        noIndex: row.noIndex,
        seoDescription: row.seoDescription,
        seoTitle: row.seoTitle,
        summary: parsed.summary.trim(),
        title: row.title.trim(),
        updatedAt: row.updatedAt,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}