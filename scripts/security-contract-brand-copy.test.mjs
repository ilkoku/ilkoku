import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("active shared brand copy derives from the canonical public brand source", () => {
  const navigation = source("src/content/navigation.ts");
  const authShell = source("src/features/auth/components/AuthShell.tsx");
  const brand = source("src/lib/public-brand.ts");

  assert.match(brand, /publicBrandEditorialSlogan\s*=\s*"İlk cümle, ilk okurun, ilk adımın\."/u);
  assert.match(navigation, /publicBrandEditorialSlogan/u);
  assert.match(navigation, /brandName:\s*publicBrandName/u);
  assert.match(navigation, /tagline:\s*publicBrandEditorialSlogan/u);
  assert.doesNotMatch(navigation, /Her hikâye burada başlar\./u);
  assert.match(authShell, /authContent\.common\.tagline/u);
});

test("root social share card uses the selected İlkOku artwork as static metadata images", () => {
  const prepare = source("scripts/prepare-social-images.mjs");
  const packageJson = JSON.parse(source("package.json"));
  const ogAlt = source("src/app/opengraph-image.alt.txt");
  const twitterAlt = source("src/app/twitter-image.alt.txt");

  assert.equal(
    existsSync(join(ROOT, "public/og/ilkoku-social-selected-2026.webp")),
    true,
  );
  assert.match(prepare, /ilkoku-social-selected-2026\.webp/u);
  assert.match(prepare, /opengraph-image\.jpg/u);
  assert.match(prepare, /twitter-image\.jpg/u);
  assert.match(prepare, /resize\(1200, 630/u);
  assert.match(packageJson.scripts.dev, /social-images:prepare/u);
  assert.match(packageJson.scripts.build, /social-images:prepare/u);
  assert.match(packageJson.scripts["build:ci"], /social-images:prepare/u);
  assert.match(ogAlt, /İlkOku — Dijital Yazar Platformu/u);
  assert.match(ogAlt, /İlk cümle, ilk adım\./u);
  assert.equal(twitterAlt, ogAlt);
});
