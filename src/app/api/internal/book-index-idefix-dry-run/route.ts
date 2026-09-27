import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import {
  parseIdefixBestsellers,
  parseIdefixProductDetails,
} from "@/lib/book-index/sources/idefix";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const SOURCE_CODE = "idefix";
const SOURCE_URL = "https://www.idefix.com/cok-satanlar-l-162";
const DETAIL_CONCURRENCY = 6;
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

function safeErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 180)
    : "UNKNOWN_IDEFIX_DETAIL_ERROR";
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`BOOK_INDEX_SOURCE_HTTP_${response.status}`);
  }

  return response.text();
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
    const parsed = parseIdefixBestsellers(await fetchHtml(SOURCE_URL));
    const details = new Array<{
      rank: number;
      authorName: string | null;
      isbn13: string | null;
      error: string | null;
    }>(parsed.books.length);
    let nextIndex = 0;

    const workers = Array.from(
      { length: Math.min(DETAIL_CONCURRENCY, parsed.books.length) },
      async () => {
        while (true) {
          const index = nextIndex;
          nextIndex += 1;
          if (index >= parsed.books.length) return;

          const book = parsed.books[index];

          try {
            const detail = parseIdefixProductDetails(
              await fetchHtml(book.productUrl),
              book.title,
            );

            details[index] = {
              rank: book.rank,
              authorName: book.authorName || detail.authorName || null,
              isbn13: detail.isbn13 || book.isbn13 || null,
              error: null,
            };
          } catch (error) {
            details[index] = {
              rank: book.rank,
              authorName: book.authorName || null,
              isbn13: book.isbn13 || null,
              error: safeErrorMessage(error),
            };
          }
        }
      },
    );

    await Promise.all(workers);

    const successfulDetails = details.filter((detail) => !detail.error);
    const detailErrors = details.filter((detail) => Boolean(detail.error));
    const missingIdentity = successfulDetails.filter(
      (detail) => !detail.authorName && !detail.isbn13,
    );
    const missingIdentityRanks = new Set(
      missingIdentity.map((detail) => detail.rank),
    );

    return NextResponse.json({
      ok: true,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      sourceCode: SOURCE_CODE,
      bookCount: parsed.books.length,
      detailSuccessCount: successfulDetails.length,
      detailErrorCount: detailErrors.length,
      detailErrorSamples: detailErrors.slice(0, 8).map((detail) => ({
        rank: detail.rank,
        error: detail.error,
      })),
      withAuthorCount: successfulDetails.filter(
        (detail) => Boolean(detail.authorName),
      ).length,
      withIsbn13Count: successfulDetails.filter(
        (detail) => Boolean(detail.isbn13),
      ).length,
      missingIdentityCount: missingIdentity.length,
      missingIdentityRanks: missingIdentity.map((detail) => detail.rank),
      missingIdentitySamples: parsed.books
        .filter((book) => missingIdentityRanks.has(book.rank))
        .slice(0, 20)
        .map((book) => ({
          rank: book.rank,
          sourceKey: book.sourceKey,
          title: book.title,
          productUrl: book.productUrl,
        })),
      duplicateSourceKeyCount:
        parsed.books.length
        - new Set(parsed.books.map((book) => book.sourceKey)).size,
      rankMin: parsed.books.length
        ? Math.min(...parsed.books.map((book) => book.rank))
        : null,
      rankMax: parsed.books.length
        ? Math.max(...parsed.books.map((book) => book.rank))
        : null,
    });
  } catch (error) {
    const message = safeErrorMessage(error);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
