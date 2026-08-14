import { notFound, permanentRedirect } from "next/navigation";
import { normalizeCmsRedirectPath, parseCmsRedirectValue } from "@/lib/cms-redirects";
import { prisma } from "@/lib/prisma";

type RedirectRow = { valueJson: string };

type PageProps = {
  params: Promise<{ path: string[] }>;
};

export const dynamic = "force-dynamic";

export default async function CmsRedirectFallback({ params }: PageProps) {
  const { path } = await params;

  let source = "";
  try {
    source = normalizeCmsRedirectPath(`/${path.join("/")}`, "source");
  } catch {
    notFound();
  }

  let rows: RedirectRow[] = [];
  try {
    rows = await prisma.$queryRaw<RedirectRow[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'redirect'
        AND contentKey = ${source}
        AND status = 'published'
      LIMIT 1
    `;
  } catch {
    notFound();
  }

  const value = rows[0] ? parseCmsRedirectValue(rows[0].valueJson) : null;
  if (!value || value.source !== source) notFound();

  permanentRedirect(value.target);
}
