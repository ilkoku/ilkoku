import { NextResponse } from "next/server";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type Row = { contentKey: string; valueJson: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = normalizeCmsLocale(url.searchParams.get("dil"));
  const enabled = await isCmsLocaleEnabled(locale);

  if (!enabled) {
    return NextResponse.json({ locale, enabled: false, content: {} });
  }

  const namespace = cmsLocaleNamespace("homepage", locale);

  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT contentKey, valueJson
      FROM SiteContent
      WHERE namespace = ${namespace}
        AND status = 'published'
    `;

    const allowed = new Set(["hero", "roles", "passport", "why", "footer"]);
    const content: Record<string, Record<string, string>> = {};

    for (const row of rows) {
      if (!allowed.has(row.contentKey)) continue;
      try {
        const raw = JSON.parse(row.valueJson) as Record<string, unknown>;
        const clean: Record<string, string> = {};
        for (const [key, value] of Object.entries(raw)) {
          if (typeof value === "string") clean[key] = value.trim();
        }
        content[row.contentKey] = clean;
      } catch {}
    }

    return NextResponse.json({ locale, enabled: true, content });
  } catch {
    return NextResponse.json({ locale, enabled: true, content: {} });
  }
}
