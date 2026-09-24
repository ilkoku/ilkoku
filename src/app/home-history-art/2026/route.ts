import part00 from "./data/part-00";
import part01 from "./data/part-01";
import part02 from "./data/part-02";
import part03 from "./data/part-03";
import part04 from "./data/part-04";
import part05 from "./data/part-05";
import part06 from "./data/part-06";
import part07 from "./data/part-07";
import part08 from "./data/part-08";

export const runtime = "nodejs";

const imageBase64 = [part00, part01, part02, part03, part04, part05, part06, part07, part08].join("");
const imageBytes = Buffer.from(imageBase64, "base64");

export async function GET() {
  return new Response(imageBytes, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
