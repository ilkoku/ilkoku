import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(ROOT, "public", "og", "ilkoku-social-selected-2026.webp");
const appDir = join(ROOT, "src", "app");
const targets = [
  join(appDir, "opengraph-image.jpg"),
  join(appDir, "twitter-image.jpg"),
];

await mkdir(appDir, { recursive: true });

const jpeg = await sharp(source)
  .resize(1200, 630, { fit: "cover" })
  .jpeg({ quality: 82, progressive: true })
  .toBuffer();

await Promise.all(targets.map((target) => writeFile(target, jpeg)));

console.log("Prepared 1200x630 Open Graph and X/Twitter social images.");
