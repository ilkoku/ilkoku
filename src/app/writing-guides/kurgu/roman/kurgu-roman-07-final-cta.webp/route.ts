import { readFile } from "node:fs/promises";
import path from "node:path";

const assetPath = path.join(
  process.cwd(),
  "public/writing-guides/kurgu/roman/kurgu-roman-07-final-cta.webp.b64",
);

export async function GET() {
  const encoded = (await readFile(assetPath, "utf8")).trim();

  return new Response(Buffer.from(encoded, "base64"), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/webp",
    },
  });
}
