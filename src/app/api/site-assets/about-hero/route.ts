import part0 from "@/components/content/about-hero-data/part0";
import part1 from "@/components/content/about-hero-data/part1";
import part2 from "@/components/content/about-hero-data/part2";
import part3 from "@/components/content/about-hero-data/part3";
import part4 from "@/components/content/about-hero-data/part4";
import part5 from "@/components/content/about-hero-data/part5";
import part6 from "@/components/content/about-hero-data/part6";
import part7 from "@/components/content/about-hero-data/part7";

export const runtime = "nodejs";

export function GET() {
  const bytes = Buffer.from(
    part0 + part1 + part2 + part3 + part4 + part5 + part6 + part7,
    "base64",
  );

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
