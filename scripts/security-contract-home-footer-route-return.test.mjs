import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/content/PublicFooterHydrator.tsx", "utf8");

test("homepage footer hydration reruns when client navigation returns to root", () => {
  assert.match(source, /import \{ usePathname \} from "next\/navigation";/);
  assert.match(source, /const pathname = usePathname\(\);/);
  assert.match(source, /if \(pathname !== "\/"\) return;/);
  assert.match(source, /\}, \[pathname\]\);/);
  assert.doesNotMatch(source, /window\.location\.pathname !== "\/"/);
});

test("route-return hydration still rebuilds the canonical homepage footer before CMS fetch", () => {
  const legalIndex = source.indexOf("ensureLegalBar(footer, {});");
  const platformIndex = source.indexOf('rebuildPlatformColumn(findColumn(footer, "Platform"), {});');
  const trustIndex = source.indexOf("rebuildTrustColumn(footer);");
  const fetchIndex = source.indexOf('fetch("/api/site-content/footer-navigation"');

  assert.ok(legalIndex >= 0);
  assert.ok(platformIndex > legalIndex);
  assert.ok(trustIndex > platformIndex);
  assert.ok(fetchIndex > trustIndex);
});
