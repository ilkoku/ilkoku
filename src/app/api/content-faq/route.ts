import { NextResponse } from "next/server";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };
type FaqItem = {
  id?: string;
  question?: string;
  answer?: string;
  category?: string;
  audience?: string;
  position?: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = normalizeCmsLocale(url.searchParams.get("dil"));
  const enabled = await isCmsLocaleEnabled(locale);

  if (!enabled) return NextResponse.json({ locale, enabled: false, items: [] });

  const namespace = cmsLocaleNamespace("faq", locale);

  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = ${namespace}
        AND status = 'published'
      ORDER BY updatedAt ASC
      LIMIT 300
    `;

    const items = rows
      .map((row) => {
        try { return JSON.parse(row.valueJson) as FaqItem; } catch { return null; }
      })
      .filter((item): item is FaqItem => Boolean(item?.question && item?.answer))
      .sort((a, b) => {
        const positionDiff = (a.position ?? 0) - (b.position ?? 0);
        if (positionDiff !== 0) return positionDiff;
        return (a.category || "").localeCompare(b.category || "", locale);
      });

    return NextResponse.json({ locale, enabled: true, items });
  } catch {
    return NextResponse.json({ locale, enabled: true, items: [] });
  }
}
