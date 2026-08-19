import { NextResponse } from "next/server";
import { getCmsAccess } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

const keyPattern = /^contact_[0-9a-f-]{36}$/i;
const allowedActions = new Set(["review", "resolve", "reopen", "archive"]);
const allowedFilters = new Set(["all", "new", "reviewing", "resolved", "archived", "invalid"]);

type SubmissionRow = {
  valueJson: string;
  status: "draft" | "published" | "archived";
};

function redirectToWorkbench(request: Request, key: string, result: string, filter: string) {
  const url = new URL("/icerik/formlar", request.url);
  url.searchParams.set("sec", key);
  url.searchParams.set("islem", result);
  if (allowedFilters.has(filter) && filter !== "all") url.searchParams.set("durum", filter);
  return NextResponse.redirect(url, 303);
}

function parseSubmission(valueJson: string) {
  try {
    const value = JSON.parse(valueJson) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    if (typeof data.name !== "string" || typeof data.email !== "string" || typeof data.message !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const access = await getCmsAccess();
  if (!access.canManage) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const form = await request.formData();
  const key = String(form.get("key") ?? "").trim();
  const action = String(form.get("action") ?? "").trim();
  const filter = String(form.get("filter") ?? "all").trim();
  if (!keyPattern.test(key) || !allowedActions.has(action)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<SubmissionRow[]>`
    SELECT valueJson, status
    FROM SiteContent
    WHERE namespace = 'form_submission'
      AND contentKey = ${key}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });

  const payload = parseSubmission(row.valueJson);
  if (!payload) return redirectToWorkbench(request, key, "veri", filter);

  let nextStatus: "published" | "archived" = row.status === "archived" ? "archived" : "published";
  let nextState = typeof payload.state === "string" ? payload.state : "new";

  if (action === "review") {
    nextState = "reviewing";
    nextStatus = "published";
  } else if (action === "resolve") {
    nextState = "resolved";
    nextStatus = "published";
  } else if (action === "reopen") {
    nextState = "new";
    nextStatus = "published";
  } else if (action === "archive") {
    nextStatus = "archived";
  }

  const nextValueJson = JSON.stringify({
    ...payload,
    state: nextState,
    managedAt: new Date().toISOString(),
  });

  await prisma.$executeRaw`
    UPDATE SiteContent
    SET valueJson = ${nextValueJson}, status = ${nextStatus},
        updatedById = ${access.user!.id}, updatedAt = CURRENT_TIMESTAMP(3)
    WHERE namespace = 'form_submission' AND contentKey = ${key}
  `;

  return redirectToWorkbench(request, key, action, filter);
}
