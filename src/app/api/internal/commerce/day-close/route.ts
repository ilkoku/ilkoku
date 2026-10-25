import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, open, readFile, realpath, unlink } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

import { getDayClosePackage } from "@/features/commerce/day-close-repository";
import { istanbulBusinessDate, sha256 } from "@/features/commerce/day-close-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function authorized(request: Request) {
  const secret = process.env.ILKOKU_DAY_CLOSE_CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32 || !supplied.startsWith("Bearer ")) return false;
  const digest = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(supplied.slice(7)), digest(secret));
}

function previousIstanbulDay(now: Date) {
  const [y, m, d] = istanbulBusinessDate(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

async function privateArchiveDirectory() {
  const configured = process.env.ILKOKU_DAY_CLOSE_ARCHIVE_DIR ?? "";
  if (!isAbsolute(configured)) throw new Error("PRIVATE_ARCHIVE_NOT_CONFIGURED");
  const [dir, appRoot] = await Promise.all([realpath(configured),realpath(process.cwd())]);
  // The archive must be provisioned in a non-public, non-application directory.
  const relation = relative(appRoot,dir);
  if (!relation || (!relation.startsWith("..") && !isAbsolute(relation)) ||
      /(?:^|[/\\])(?:public_html|wwwroot|htdocs)(?:[/\\]|$)/iu.test(dir)) {
    throw new Error("ARCHIVE_DIRECTORY_UNSAFE");
  }
  const stats = await lstat(configured);
  if (!stats.isDirectory() || (stats.mode & 0o077) !== 0) {
    throw new Error("ARCHIVE_DIRECTORY_PERMISSIONS_UNSAFE");
  }
  return dir;
}

/**
 * Optional Hostinger cron hook, deliberately INACTIVE until both private
 * server env settings and an explicit 00:10 Europe/Istanbul schedule exist.
 * Never issues invoices, posts ledgers or transfers money.
 *
 * Archive is write-once; the same day with changed data produces a 409
 * review warning instead of quietly replacing the earlier package.
 */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401, headers: HEADERS });
  if (!process.env.ILKOKU_DAY_CLOSE_ARCHIVE_DIR) {
    return Response.json({ ok: false, reason: "archive_not_configured" }, { status: 503, headers: HEADERS });
  }
  const now = new Date();
  const day = previousIstanbulDay(now);

  try {
    const dir = await privateArchiveDirectory();
    const result = await getDayClosePackage(day,now);
    if (!result.ok) {
      return Response.json({ ok: false, reason: "source_review_required" }, { status: 422, headers: HEADERS });
    }
    const path = join(dir,"ilkoku-gun-sonu-" + day + ".zip");
    const temp = join(dir,"." + day + "-" + randomUUID() + ".tmp");
    const digest = sha256(result.zip);
    // Finish a durable temporary write before publishing with an atomic link.
    // A failed/disconnected write must never leave a partial final ZIP.
    try {
      const handle = await open(temp,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
        0o600);
      try {
        await handle.writeFile(result.zip);
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        await link(temp,path);
        return Response.json({
          ok: true, day, archive: "written",
          sha256: digest, warnings: result.manifest.flaggedSalesCount + result.manifest.flaggedRefundCount,
        }, { headers: HEADERS });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const archived = await readFile(path);
        if (sha256(archived) !== digest) {
          return Response.json({
            ok: false, day, reason: "archived_day_changed_manual_review_required",
          }, { status: 409, headers: HEADERS });
        }
        return Response.json({
          ok: true, day, archive: "already_exists", sha256: digest,
          warnings: result.manifest.flaggedSalesCount + result.manifest.flaggedRefundCount,
        }, { headers: HEADERS });
      }
    } finally {
      await unlink(temp).catch(() => {});
    }
  } catch {
    // Do not leak path, source records, token or internal errors.
    return Response.json({ ok: false, reason: "day_close_failed" }, {
      status: 503, headers: HEADERS,
    });
  }
}
