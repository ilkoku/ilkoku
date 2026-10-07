import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://ilkoku.com";
const YANDEX_INDEXNOW_ENDPOINT = "https://yandex.com/indexnow";

export const YANDEX_DELETED_URLS = [
  `${SITE_ORIGIN}/puan-durumu`,
  `${SITE_ORIGIN}/namaz-vakitleri`,
  `${SITE_ORIGIN}/page`,
];

export const YANDEX_NOINDEX_URLS = [
  `${SITE_ORIGIN}/editorler`,
  `${SITE_ORIGIN}/editorler-icin/egitim/tur-editorlugu`,
  `${SITE_ORIGIN}/editorler-icin/egitim/yazarla-calismak`,
  `${SITE_ORIGIN}/en-cok-satanlar/birden-fazla-listede-cok-satanlar`,
  `${SITE_ORIGIN}/en-cok-satanlar/cok-satanlara-yeni-girenler`,
  `${SITE_ORIGIN}/en-cok-satanlar/cok-satanlarda-yukselenler`,
  `${SITE_ORIGIN}/en-cok-satanlar/turkiye`,
  `${SITE_ORIGIN}/en-cok-satanlar/turkiye/karsilastirma`,
  `${SITE_ORIGIN}/en-cok-satanlar/uzun-suredir-cok-satanlar`,
  `${SITE_ORIGIN}/yasal/cerez-politikasi`,
  `${SITE_ORIGIN}/yasal/gizlilik-politikasi`,
  `${SITE_ORIGIN}/yasal/kullanim-sartlari`,
  `${SITE_ORIGIN}/yasal/telif-hakki-politikasi`,
  `${SITE_ORIGIN}/yardim`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/alternatif-tarih`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/casusluk`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/dram`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/gerilim`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/gotik`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/hiciv`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/korku`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/mitoloji`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/mizah`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/paranormal`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/polisiye`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/post-apokaliptik`,
  `${SITE_ORIGIN}/yazarlar-icin/kurgu/romantik`,
  `${SITE_ORIGIN}/yazarlar-icin/senaryo-ve-sahne/tiyatro`,
  `${SITE_ORIGIN}/yeni-cikanlar`,
];

export const YANDEX_REFRESH_URLS = [
  `${SITE_ORIGIN}/hakkimizda`,
];

export const YANDEX_CLEANUP_URLS = [
  ...YANDEX_DELETED_URLS,
  ...YANDEX_NOINDEX_URLS,
  ...YANDEX_REFRESH_URLS,
];

function requireValue(name, value) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
}

function hasRobotsNoindex(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/giu)) {
    const tag = match[0].toLowerCase();
    const isRobots =
      tag.includes('name="robots"')
      || tag.includes("name='robots'");
    if (isRobots && tag.includes("noindex")) return true;
  }
  return false;
}

async function fetchLive(url) {
  return fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "IlkOku-Yandex-Index-Cleanup/1.0",
    },
    signal: AbortSignal.timeout(20_000),
  });
}

async function validateKey(key) {
  const keyUrl = `${SITE_ORIGIN}/${key}.txt`;
  const response = await fetchLive(keyUrl);
  const body = (await response.text()).trim();

  if (!response.ok || body !== key) {
    throw new Error(
      `IndexNow key validation failed: ${keyUrl} -> HTTP ${response.status}`,
    );
  }

  return keyUrl;
}

async function validateDeletedUrls() {
  for (const url of YANDEX_DELETED_URLS) {
    const response = await fetchLive(url);
    if (![404, 410].includes(response.status)) {
      throw new Error(
        `Deleted legacy URL must remain 404/410 before cleanup submission: ${url} -> HTTP ${response.status}`,
      );
    }
    console.log(`DELETE READY: ${url} -> HTTP ${response.status}`);
  }
}

async function validateNoindexUrls() {
  for (const url of YANDEX_NOINDEX_URLS) {
    const response = await fetchLive(url);
    const html = await response.text();
    const headerNoindex = (response.headers.get("x-robots-tag") || "")
      .toLowerCase()
      .includes("noindex");

    if (response.status !== 200) {
      throw new Error(
        `Noindex cleanup URL must stay live: ${url} -> HTTP ${response.status}`,
      );
    }

    if (!headerNoindex && !hasRobotsNoindex(html)) {
      throw new Error(
        `Noindex cleanup URL is missing a noindex directive: ${url}`,
      );
    }

    console.log(`NOINDEX READY: ${url} -> HTTP 200 + noindex`);
  }
}

async function validateRefreshUrls() {
  for (const url of YANDEX_REFRESH_URLS) {
    const response = await fetchLive(url);
    const html = await response.text();

    if (response.status !== 200) {
      throw new Error(
        `Refresh URL must be live: ${url} -> HTTP ${response.status}`,
      );
    }

    if (!html.includes(`rel="canonical" href="${url}"`)) {
      throw new Error(
        `Refresh URL canonical mismatch: ${url}`,
      );
    }

    if (hasRobotsNoindex(html)) {
      throw new Error(
        `Refresh URL must remain indexable: ${url}`,
      );
    }

    console.log(`REFRESH READY: ${url} -> HTTP 200 + canonical indexable`);
  }
}

async function submitToYandex(key, keyLocation) {
  const payload = {
    host: "ilkoku.com",
    key,
    keyLocation,
    urlList: YANDEX_CLEANUP_URLS,
  };

  const response = await fetch(YANDEX_INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "user-agent": "IlkOku-Yandex-Index-Cleanup/1.0",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });

  const body = await response.text();

  console.log(
    JSON.stringify({
      yandexIndexNowCleanup: {
        endpoint: YANDEX_INDEXNOW_ENDPOINT,
        status: response.status,
        deleted: YANDEX_DELETED_URLS,
        noindex: YANDEX_NOINDEX_URLS,
        refresh: YANDEX_REFRESH_URLS,
      },
    }),
  );

  if (![200, 202].includes(response.status)) {
    throw new Error(
      `Yandex IndexNow cleanup failed: HTTP ${response.status} ${body.trim()}`,
    );
  }

  console.log(
    `PASS: Yandex accepted ${YANDEX_CLEANUP_URLS.length} cleanup/refresh URLs via IndexNow.`,
  );
}

export async function runYandexCleanup() {
  const key = process.env.INDEXNOW_KEY;
  requireValue("INDEXNOW_KEY", key);

  const keyLocation = await validateKey(key);
  await validateDeletedUrls();
  await validateNoindexUrls();
  await validateRefreshUrls();
  await submitToYandex(key, keyLocation);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  runYandexCleanup().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
