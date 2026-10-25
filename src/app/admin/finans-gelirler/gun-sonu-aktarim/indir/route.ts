import { getCurrentUser } from "@/lib/auth/current-user";
import { getDayClosePackage } from "@/features/commerce/day-close-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Oturum gerekli.", { status: 401, headers: PRIVATE_HEADERS });
  if (user.role !== "admin") {
    return new Response("Yalnız yönetici erişebilir.", { status: 403, headers: PRIVATE_HEADERS });
  }

  const day = new URL(request.url).searchParams.get("gun") ?? "";
  const result = await getDayClosePackage(day);
  if (!result.ok) {
    return new Response(result.reason, { status: 422, headers: {
      ...PRIVATE_HEADERS, "Content-Type": "text/plain; charset=utf-8",
    } });
  }

  // This is NOT an invoice, official e-document, payout or accounting posting.
  return new Response(new Uint8Array(result.zip), {
    status: 200,
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="ilkoku-gun-sonu-' + day + '.zip"',
    },
  });
}
