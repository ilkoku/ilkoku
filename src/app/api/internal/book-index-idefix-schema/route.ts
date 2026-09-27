import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SOURCE_URL = "https://www.idefix.com/cok-satanlar-l-162";
const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_AUDIENCE = "ilkoku-idefix-schema-probe";
const GITHUB_OIDC_JWKS = createRemoteJWKSet(
  new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`),
);
const GITHUB_REPOSITORY = "ilkoku/ilkoku";
const GITHUB_REPOSITORY_ID = "1304046004";
const GITHUB_WORKFLOW_REF =
  "ilkoku/ilkoku/.github/workflows/book-index-idefix-schema-probe.yml@refs/heads/main";
const ALLOWED_GITHUB_EVENTS = new Set(["push", "workflow_dispatch"]);
const INTERESTING = /(author|writer|yazar|creator|isbn|barcode|barkod|sku|publisher|brand|yayınevi|yayinevi)/iu;

type JsonRecord = Record<string, unknown>;

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

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function scalarPreview(value: unknown): unknown {
  if (
    typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
    || value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const scalars = value.filter(
      (entry) =>
        typeof entry === "string"
        || typeof entry === "number"
        || typeof entry === "boolean"
        || entry === null,
    );
    return scalars.length === value.length ? scalars.slice(0, 12) : undefined;
  }

  return undefined;
}

function collectRelevantNodes(
  value: unknown,
  path = "root",
  depth = 0,
  output: Array<{ path: string; values: Record<string, unknown> }> = [],
) {
  if (depth > 7 || output.length >= 80) return output;

  if (Array.isArray(value)) {
    value.slice(0, 30).forEach((entry, index) => {
      collectRelevantNodes(entry, `${path}[${index}]`, depth + 1, output);
    });
    return output;
  }

  const record = asRecord(value);
  if (!record) return output;

  const entries = Object.entries(record);
  const nodeInteresting = entries.some(([key, child]) =>
    INTERESTING.test(key)
      || (typeof child === "string" && INTERESTING.test(child)),
  );

  if (nodeInteresting) {
    const values: Record<string, unknown> = {};
    for (const [key, child] of entries) {
      const preview = scalarPreview(child);
      if (preview !== undefined) values[key] = preview;
    }
    output.push({ path, values });
  }

  for (const [key, child] of entries) {
    if (child && typeof child === "object") {
      collectRelevantNodes(child, `${path}.${key}`, depth + 1, output);
    }
  }

  return output;
}

function isBookItem(item: JsonRecord) {
  const categoryTree = item.categoryTree;
  if (!Array.isArray(categoryTree)) return false;

  return categoryTree.some((entry) => {
    const category = asRecord(entry);
    return category?.id === 3307 || category?.name === "Kitap";
  });
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(SOURCE_URL, {
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "IlkOkuBookIndex/0.1 (+https://ilkoku.com)",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `SOURCE_HTTP_${response.status}` },
        { status: 502 },
      );
    }

    const html = await response.text();
    const match = html.match(
      /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/iu,
    );
    if (!match?.[1]) {
      return NextResponse.json({
        ok: false,
        error: "NEXT_DATA_NOT_FOUND",
        htmlLength: html.length,
      });
    }

    const nextData = JSON.parse(match[1]) as JsonRecord;
    const props = asRecord(nextData.props);
    const pageProps = asRecord(props?.pageProps);
    const landingData = asRecord(pageProps?.landingData);
    const items = Array.isArray(landingData?.items)
      ? landingData.items
      : [];

    const samples = items.flatMap((raw) => {
      const item = asRecord(raw);
      if (!item || !isBookItem(item)) return [];

      const variants = Array.isArray(item.variants) ? item.variants : [];
      const variant = asRecord(variants[0]);
      if (!variant || variant.isSponsored === true) return [];

      return [{
        itemKeys: Object.keys(item).sort(),
        variantKeys: Object.keys(variant).sort(),
        itemRelevantNodes: collectRelevantNodes(item, "item"),
        variantRelevantNodes: collectRelevantNodes(variant, "variant"),
      }];
    }).slice(0, 5);

    return NextResponse.json({
      ok: true,
      htmlLength: html.length,
      pagePropsKeys: pageProps ? Object.keys(pageProps).sort() : [],
      landingDataKeys: landingData ? Object.keys(landingData).sort() : [],
      itemCount: items.length,
      sampleCount: samples.length,
      samples,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "UNKNOWN_IDEFIX_SCHEMA_PROBE_ERROR";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
