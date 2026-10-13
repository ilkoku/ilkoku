import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const issuer = "https://token.actions.githubusercontent.com";
const audience = "ilkoku-runtime-origin-health";
const repository = "ilkoku/ilkoku";
const repositoryId = "1304046004";
const workflowRef = "ilkoku/ilkoku/.github/workflows/runtime-origin-health.yml@refs/heads/main";
const jwks = createRemoteJWKSet(new URL(issuer + "/.well-known/jwks"));
const headers = {
  "Cache-Control": "no-store, max-age=0",
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
      && (payload.event_name === "schedule" || payload.event_name === "workflow_dispatch");
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, {
      status: 401, headers,
    });
  }
  const observedMs = Date.now();
  const uptimeSeconds = process.uptime();
  const memory = process.memoryUsage();
  return NextResponse.json({
    ok: true,
    observedAt: new Date(observedMs).toISOString(),
    pid: process.pid,
    processStartedAt: new Date(observedMs - uptimeSeconds * 1000).toISOString(),
    uptimeSeconds: Math.round(uptimeSeconds),
    rssBytes: memory.rss,
  }, { status: 200, headers });
}
