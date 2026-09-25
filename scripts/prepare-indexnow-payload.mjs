import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://ilkoku.com";

const globalImpactFiles = new Set([
  ".github/workflows/indexnow-submit.yml",
  "src/app/globals.css",
  "src/app/landing-account-bubble.css",
  "src/app/landing-footer-pro.css",
  "src/app/landing-footer-tight.css",
  "src/app/landing-header-pro.css",
  "src/app/landing-role-icons.css",
  "src/app/landing-theme.css",
  "src/app/layout.tsx",
  "src/app/public-discovery-paused.css",
  "src/app/site-contact-links.css",
  "src/app/opengraph-image.tsx",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
  "src/app/twitter-image.tsx",
  "src/components/content/PublicAnnouncementBanner.tsx",
  "src/components/content/PublicCmsHydrator.tsx",
  "src/components/content/PublicTrustFooter.tsx",
  "src/components/layout/PublicNavigationHistory.tsx",
  "src/components/layout/PublicSiteHeader.tsx",
  "src/content/navigation.ts",
  "src/lib/public-brand.ts",
  "src/lib/public-page-metadata.ts",
  "src/lib/public-site-navigation.ts",
  "src/lib/site-contact.ts",
]);

const contentRouteByFile = new Map([
  ["src/content/about.ts", "/hakkimizda"],
  ["src/content/community-rules.ts", "/topluluk-kurallari"],
  ["src/content/content-age-policy.ts", "/icerik-ve-yas-politikasi"],
  ["src/content/copyright-notice.ts", "/telif-bildirimi"],
  ["src/content/editorial-standards.ts", "/editoryal-standartlar"],
  ["src/content/for-editors.ts", "/editorler-icin"],
  ["src/content/for-publishers.ts", "/yayinevleri-icin"],
  ["src/content/for-writers.ts", "/yazarlar-icin"],
  ["src/content/how-it-works.ts", "/nasil-calisir"],
]);

const pageNames = ["page.tsx", "page.ts", "page.jsx", "page.js"];
const subtreeNames = new Set([
  "layout.tsx",
  "layout.ts",
  "layout.jsx",
  "layout.js",
  "template.tsx",
  "template.ts",
  "template.jsx",
  "template.js",
  "error.tsx",
  "error.ts",
  "error.jsx",
  "error.js",
  "loading.tsx",
  "loading.ts",
  "loading.jsx",
  "loading.js",
  "not-found.tsx",
  "not-found.ts",
  "not-found.jsx",
  "not-found.js",
]);

function decodeXmlText(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/u, "") || "/";
}

function urlPath(url) {
  return normalizePathname(new URL(url).pathname);
}

export function parseSitemapUrls(xml) {
  const urls = [];
  const seen = new Set();

  for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gu)) {
    const value = decodeXmlText(match[1].trim());
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      continue;
    }
    if (parsed.origin !== SITE_ORIGIN) continue;
    const canonical = `${SITE_ORIGIN}${normalizePathname(parsed.pathname)}`;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    urls.push(canonical);
  }

  return urls;
}

function routeSegmentsFromDirectory(directory) {
  const relative = directory === "src/app" ? "" : directory.slice("src/app/".length);
  const rawSegments = relative.split("/").filter(Boolean);
  const routeSegments = [];

  for (const segment of rawSegments) {
    if (/^\([^)]*\)$/u.test(segment)) continue;
    if (segment.startsWith("@")) continue;
    if (/^\(\.\.?\.?.*\)/u.test(segment)) return null;
    routeSegments.push(segment);
  }

  return routeSegments;
}

function routeImpactFromDirectory(directory, subtree = false) {
  const segments = routeSegmentsFromDirectory(directory);
  if (!segments) return null;

  const dynamicIndex = segments.findIndex((segment) => /^\[.*\]$/u.test(segment));
  if (dynamicIndex === 0) {
    return { type: "full", reason: `root dynamic route ${directory}` };
  }

  if (dynamicIndex > 0) {
    const prefix = `/${segments.slice(0, dynamicIndex).join("/")}`;
    return { type: "subtree", path: normalizePathname(prefix) };
  }

  const path = normalizePathname(`/${segments.join("/")}`);
  return subtree ? { type: "subtree", path } : { type: "exact", path };
}

function nearestPageDirectory(file, repoRoot) {
  let directory = posix.dirname(file);

  while (directory === "src/app" || directory.startsWith("src/app/")) {
    if (pageNames.some((name) => existsSync(join(repoRoot, directory, name)))) {
      return directory;
    }
    if (directory === "src/app") break;
    directory = posix.dirname(directory);
  }

  return null;
}

function appFileImpact(file, repoRoot) {
  if (!file.startsWith("src/app/") && file !== "src/app/page.tsx") return null;
  if (file.startsWith("src/app/api/")) return { type: "ignore" };
  if (globalImpactFiles.has(file)) {
    return { type: "full", reason: `global public file ${file}` };
  }

  const filename = posix.basename(file);
  const directory = posix.dirname(file);

  if (pageNames.includes(filename)) return routeImpactFromDirectory(directory, false);
  if (subtreeNames.has(filename)) return routeImpactFromDirectory(directory, true);

  const pageDirectory = nearestPageDirectory(file, repoRoot);
  if (pageDirectory) return routeImpactFromDirectory(pageDirectory, false);

  return { type: "full", reason: `unmapped app file ${file}` };
}

function addImpact(impacts, impact) {
  if (!impact || impact.type === "ignore") return null;
  if (impact.type === "full") return impact.reason ?? "full impact";
  impacts.push(impact);
  return null;
}

function matchesImpact(pathname, impact) {
  if (impact.type === "exact") return pathname === impact.path;
  if (impact.type === "subtree") {
    if (impact.path === "/") return true;
    return pathname === impact.path || pathname.startsWith(`${impact.path}/`);
  }
  return false;
}

export function selectIndexNowUrls({
  sitemapUrls,
  changedFiles,
  repoRoot = process.cwd(),
  forceFull = false,
}) {
  const urls = [...new Set(sitemapUrls)].filter((url) => {
    try {
      return new URL(url).origin === SITE_ORIGIN;
    } catch {
      return false;
    }
  });

  if (urls.length === 0) throw new Error("Sitemap contained no İlkOku public URLs");
  if (urls.length > 10_000) throw new Error(`IndexNow batch too large: ${urls.length}`);

  if (forceFull || changedFiles.includes("__FULL__")) {
    return {
      mode: "full",
      reason: forceFull ? "forced full batch" : "workflow requested full batch",
      urls,
    };
  }

  if (changedFiles.includes("__BOOK_INDEX__")) {
    return {
      mode: "book-index",
      reason: "scheduled Book Index freshness refresh",
      urls: urls.filter((url) => {
        const pathname = urlPath(url);
        return (
          pathname === "/en-cok-satanlar"
          || pathname.startsWith("/en-cok-satanlar/")
        );
      }),
    };
  }

  const impacts = [];
  let fullReason = null;

  for (const rawFile of changedFiles) {
    const file = rawFile.trim().replaceAll("\\", "/");
    if (!file) continue;

    if (globalImpactFiles.has(file)) {
      fullReason = `global public file ${file}`;
      break;
    }

    if (file.startsWith("src/features/homepage/")) {
      impacts.push({ type: "exact", path: "/" });
      continue;
    }

    if (
      file.startsWith("src/lib/book-index/")
      || file.startsWith("src/features/book-index/")
    ) {
      impacts.push({ type: "subtree", path: "/en-cok-satanlar" });
      continue;
    }

    const contentRoute = contentRouteByFile.get(file);
    if (contentRoute) {
      impacts.push({ type: "exact", path: contentRoute });
      continue;
    }

    if (file.startsWith("src/content/")) {
      fullReason = `shared or unmapped public content ${file}`;
      break;
    }

    if (file.startsWith("src/features/public-discovery/")) {
      fullReason = `shared public discovery module ${file}`;
      break;
    }

    if (file.startsWith("public/")) {
      fullReason = `public asset change ${file}`;
      break;
    }

    if (file.startsWith("src/app/") || file === "src/app/page.tsx") {
      fullReason = addImpact(impacts, appFileImpact(file, repoRoot));
      if (fullReason) break;
      continue;
    }

    // Ignore unrelated files that happened to be part of the same push.
  }

  if (fullReason) return { mode: "full", reason: fullReason, urls };

  const selected = urls.filter((url) => {
    const pathname = urlPath(url);
    return impacts.some((impact) => matchesImpact(pathname, impact));
  });

  return {
    mode: "diff",
    reason:
      impacts.length === 0
        ? "no public sitemap route affected"
        : `${impacts.length} route impact rule(s)`,
    urls: selected,
  };
}

function requiredArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return process.argv[index + 1];
}

function main() {
  const sitemapFile = requiredArg("--sitemap");
  const changedFilesFile = requiredArg("--changed-files");
  const outputFile = requiredArg("--output");
  const key = requiredArg("--key");

  const sitemapUrls = parseSitemapUrls(readFileSync(sitemapFile, "utf8"));
  const changedFiles = readFileSync(changedFilesFile, "utf8")
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);

  const selection = selectIndexNowUrls({
    sitemapUrls,
    changedFiles,
    repoRoot: process.cwd(),
  });

  const payload = {
    host: "ilkoku.com",
    key,
    keyLocation: `${SITE_ORIGIN}/${key}.txt`,
    urlList: selection.urls,
  };

  writeFileSync(outputFile, JSON.stringify(payload), "utf8");

  console.log(
    `Prepared ${selection.urls.length} URLs for IndexNow (mode=${selection.mode}; reason=${selection.reason}).`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) main();
