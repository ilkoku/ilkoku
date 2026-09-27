import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { idefixBookIndexAdapter } from "@/lib/book-index/sources/idefix";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const SOURCE_URL = "https://www.idefix.com/cok-satanlar-l-162";
const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUDIENCE = "ilkoku-idefix-dry-run";
const GITHUB_OIDC_JWKS = createRemoteJWKSet(
  new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`),
);
const GITHUB_REPOSITORY = "ilkoku/ilkoku";
const GITHUB_REPOSITORY_ID = "1304046004";
const GITHUB_WORKFLOW_REF =
  "ilkoku/ilkoku/.github/workflows/book-index-idefix-dry-run.yml@refs/heads/main";
const ALLOWED_GITHUB_EVENTS = new Set(["push", "workflow_dispatch"]);

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

async function authorized(request: NextRequest) {
  const supplied = bearerToken(request);
  if (!supplied) return false;

  try {
    const { payload } = await jwtVerify(supplied, GITHUB_OIDC_JWKS, {
      issuer: GITHUB_OIDC_ISSUER,
      audience: GITHUB_OIDC_AUDIENCE,
    });

    return payload.repository === GITHUB_REPOSITORY
      && payload.repository_id === GITHUB_REPOSITORY_ID
      && payload.workflow_ref === GITHUB_WORKFLOW_REF
      && payload.ref === "refs/heads/main"
      && typeof payload.event_name === "string"
      && ALLOWED_GITHUB_EVENTS.has(payload.event_name);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const startedAt = new Date();
    const result = await idefixBookIndexAdapter.collect({
      listCode: "idefix-tr-live-dry-run",
      sourceUrl: SOURCE_URL,
      observedAt: startedAt,
    });

    const withAuthorCount = result.books.filter(
      (book) => Boolean(book.authorName?.trim()),
    ).length;
    const withIsbn13Count = result.books.filter(
      (book) => Boolean(book.isbn13),
    ).length;
    const missingIdentity = result.books.filter(
      (book) => !book.authorName?.trim() && !book.isbn13 && !book.isbn10,
    );

    return NextResponse.json({
      ok: true,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      sourceCode: idefixBookIndexAdapter.sourceCode,
      bookCount: result.books.length,
      withAuthorCount,
      withIsbn13Count,
      missingIdentityCount: missingIdentity.length,
      missingIdentityRanks: missingIdentity.map((book) => book.rank),
      duplicateSourceKeyCount:
        result.books.length - new Set(result.books.map((book) => book.sourceKey)).size,
      rankMin: result.books.length
        ? Math.min(...result.books.map((book) => book.rank))
        : null,
      rankMax: result.books.length
        ? Math.max(...result.books.map((book) => book.rank))
        : null,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_IDEFIX_DRY_RUN_ERROR";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
