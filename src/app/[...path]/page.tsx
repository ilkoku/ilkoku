import { notFound, redirect, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };
type RedirectValue = { target?: string; code?: number };

export default async function CmsRedirectFallback({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const source = `/${path.join("/")}`;
  let rows: Row[] = [];

  try {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = 'redirect' AND contentKey = ${source} AND status = 'published'
      LIMIT 1
    `;
  } catch {}

  if (!rows[0]) notFound();

  let value: RedirectValue = {};
  try { value = JSON.parse(rows[0].valueJson) as RedirectValue; } catch { notFound(); }
  const target = String(value.target || "");
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("://") || target === source) notFound();

  if (value.code === 307) redirect(target);
  permanentRedirect(target);
}
