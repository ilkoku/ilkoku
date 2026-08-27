import heroPart0 from "@/components/content/about-hero-data/part0";
import heroPart1 from "@/components/content/about-hero-data/part1";

export const runtime = "nodejs";

export function GET() {
  const bytes = Buffer.from(heroPart0 + heroPart1, "base64");

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
