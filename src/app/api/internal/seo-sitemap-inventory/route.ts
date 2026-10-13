import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isSearchIndexExcludedPublicWorkSlug } from "@/lib/public-content-safety";
import { isSoftLaunchSearchExcludedPath } from "@/lib/soft-launch-search-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const baseUrl = "https://ilkoku.com";
const issuer = "https://token.actions.githubusercontent.com";
const audience = "ilkoku-seo-sitemap-parity";
const repository = "ilkoku/ilkoku";
const repositoryId = "1304046004";
const workflowRef = "ilkoku/ilkoku/.github/workflows/seo-sitemap-data-parity.yml@refs/heads/main";
const jwks = createRemoteJWKSet(new URL(issuer + "/.well-known/jwks"));
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

async function authorized(request: NextRequest) {
  const token = request.headers.get("x-ilkoku-github-oidc")?.trim() ?? "";
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
    return payload.repository === repository
      && payload.repository_id === repositoryId
      && payload.workflow_ref === workflowRef
      && payload.ref === "refs/heads/main"
      && (payload.event_name === "workflow_run" || payload.event_name === "workflow_dispatch");
  } catch {
    return false;
  }
}

type CmsPage = { slug: string; noIndex: boolean };

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, {
      status: 401, headers,
    });
  }

  try {
    // Match buildSitemap's work eligibility, independently of the XML fallback.
    // Select public slugs only; do not pull manuscript content or author data.
    const [works, pages] = await Promise.all([
      prisma.work.findMany({
        where: {
          archivedAt: null,
          contentRating: { not: "adult_18" },
          author: { is: { deletedAt: null, status: "active" } },
          isActive: true,
          language: "tr",
          publishedAt: { not: null },
          status: "published",
          visibility: "public",
        },
        select: { slug: true },
        take: 50_001,
      }),
      prisma.$queryRaw<CmsPage[]>`
        SELECT slug, noIndex
        FROM ContentPage
        WHERE contentKey LIKE 'page:tr:%' AND status = 'published'
        ORDER BY updatedAt DESC
        LIMIT 5001
      `,
    ]);

    if (works.length > 50_000 || pages.length > 5_000) {
      return NextResponse.json({ ok: false, error: "INVENTORY_QUERY_LIMIT" }, {
        status: 409, headers,
      });
    }

    const workUrls = works
      .filter((work) => !isSearchIndexExcludedPublicWorkSlug(work.slug))
      .map((work) => baseUrl + "/kitap/" + work.slug)
      .sort();
    const cmsUrls = pages
      .filter((page) => !page.noIndex && !isSoftLaunchSearchExcludedPath(page.slug))
      .map((page) => baseUrl + page.slug)
      .sort();

    return NextResponse.json({
      ok: true,
      observedAt: new Date().toISOString(),
      dataSource: "production-database",
      workUrls,
      cmsUrls,
      rawEligibleWorkCount: works.length,
      publishedTurkishCmsPageCount: pages.length,
    }, { status: 200, headers });
  } catch (error) {
    // Safe error category only; never echo database connection strings.
    console.error("SEO_SITEMAP_PARITY_INVENTORY_FAILED", {
      errorName: error instanceof Error ? error.name : "UNKNOWN",
    });
    return NextResponse.json({ ok: false, error: "INVENTORY_UNAVAILABLE" }, {
      status: 503, headers,
    });
  }
}
