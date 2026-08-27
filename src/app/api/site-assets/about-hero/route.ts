import { getAboutHeroImageBytes } from "@/lib/about-hero-image";

export const runtime = "nodejs";

export async function GET() {
  const bytes = getAboutHeroImageBytes();

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
