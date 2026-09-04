import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
