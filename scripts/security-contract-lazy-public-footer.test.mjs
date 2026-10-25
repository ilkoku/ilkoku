import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("footer CMS enhancement stays outside initial route bundle and SSR links remain", () => {
  const shell = read("src/components/content/PublicCmsHydrator.tsx");
  const enhancement = read("src/components/content/PublicFooterHydrator.tsx");
  const layout = read("src/app/layout.tsx");
  const footer = read("src/features/homepage/live-footer.tsx");
  assert.match(shell, /import\("@\/components\/content\/PublicFooterHydrator"\)/);
  assert.doesNotMatch(shell, /^import \{ PublicFooterHydrator \} from /m);
  assert.match(shell, /IntersectionObserver/);
  assert.match(shell, /MutationObserver/);
  assert.match(shell, /rootMargin: "1000px 0px"/);
  assert.match(shell, /pathname === "\/iletisim"/);
  assert.match(shell, /setFooterEnhancer\(\(\) => PublicFooterHydrator\)/);
  assert.match(enhancement, /ensureFooterContactBlock/);
  assert.match(enhancement, /ensureContactPageBlock/);
  assert.match(layout, /<PublicCmsHydrator \/>/);
  assert.match(footer, /siteContact\.socialLinks\.map/);
  assert.match(footer, /<CloudflareSafeEmailLink \/>/);
  assert.match(footer, /publicPlatformLinks\.map/);
});
