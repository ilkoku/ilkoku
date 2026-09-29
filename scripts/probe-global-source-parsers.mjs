import { gunzipSync } from "node:zlib";

const UA = "IlkOkuBookIndex/0.1 (+https://ilkoku.com)";
const timeoutMs = 20000;

async function fetchResponse(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  return response;
}

async function fetchText(url, headers = {}) {
  const response = await fetchResponse(url, headers);
  const text = await response.text();
  return { response, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isValidIsbn10(value) {
  if (!/^[0-9]{9}[0-9X]$/u.test(value)) return false;
  const digits = [...value].map((char, index) =>
    index === 9 && char === "X" ? 10 : Number(char)
  );
  return digits.reduce((sum, digit, index) => sum + digit * (10 - index), 0) % 11 === 0;
}

async function probeAmazon(label, url) {
  const { response, text } = await fetchText(url, {
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
  });
  assert(response.ok, `${label}:HTTP_${response.status}`);
  assert(!/captcha|robot check|enter the characters you see below/iu.test(text), `${label}:ACCESS_CHALLENGE`);

  const indices = [...text.matchAll(/p13n-asin-index-([0-9]+)/gu)].map((m) => Number(m[1]));
  const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);
  const expected = Array.from({ length: 30 }, (_, i) => i);
  assert(uniqueIndices.length >= 30, `${label}:INDEX_COUNT_${uniqueIndices.length}`);
  assert(expected.every((value, index) => uniqueIndices[index] === value), `${label}:INDEX_SEQUENCE`);

  const asins = [...text.matchAll(/data-asin=["']([A-Z0-9]{10})["']/gu)].map((m) => m[1]);
  const uniqueAsins = [...new Set(asins)];
  assert(uniqueAsins.length >= 30, `${label}:ASIN_COUNT_${uniqueAsins.length}`);
  const firstThirtyAsins = uniqueAsins.slice(0, 30);
  const validIsbn10Asins = firstThirtyAsins.filter(isValidIsbn10);

  return {
    http: response.status,
    cardIndices: uniqueIndices.slice(0, 30),
    uniqueAsins: uniqueAsins.length,
    validIsbn10AsinCount: validIsbn10Asins.length,
    nonIsbnAsinCount: firstThirtyAsins.length - validIsbn10Asins.length,
    validIsbn10Asins,
  };
}

async function probeIbs() {
  const url = "https://www.ibs.it/classifica/libri/1day/sold?defaultPage=1";
  const { response, text } = await fetchText(url, {
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.7",
  });
  assert(response.ok, `IBS_IT:HTTP_${response.status}`);
  const cardCount = (text.match(/cc-product-list-item--ranking/gu) ?? []).length;
  assert(cardCount === 40, `IBS_IT:CARD_COUNT_${cardCount}`);
  assert(text.includes("Classifica Libri - 1day"), "IBS_IT:LIST_IDENTITY");
  return { http: response.status, cardCount };
}

async function probeRakuten() {
  const url = "https://rdc-api-catalog-gateway-api.rakuten.co.jp/books/rank/001/weekly.json?hits=30&page=1&period=0&sid=10";
  const response = await fetchResponse(url, {
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.7",
  });
  assert(response.ok, `RAKUTEN_JP:HTTP_${response.status}`);
  const payload = await response.json();
  assert(String(payload.genre_id) === "001", `RAKUTEN_JP:GENRE_${payload.genre_id}`);
  assert(Array.isArray(payload.data) && payload.data.length === 30, `RAKUTEN_JP:COUNT_${payload.data?.length}`);
  const ranks = payload.data.map((item) => Number(item.rank));
  assert(ranks.every((rank, index) => rank === index + 1), "RAKUTEN_JP:RANK_SEQUENCE");
  const keys = payload.data.map((item) => String(item.isbn_jan || item.url || item.title || ""));
  assert(keys.every(Boolean), "RAKUTEN_JP:IDENTITY_MISSING");
  return { http: response.status, count: payload.data.length, firstRank: ranks[0], lastRank: ranks.at(-1) };
}

async function probeKyobo() {
  const url = "https://store.kyobobook.co.kr/api/gw/best/best-seller/online?page=1&per=20&period=002&dsplDvsnCode=001&dsplTrgtDvsnCode=002&saleCmdtDsplDvsnCode=TOT";
  const response = await fetchResponse(url, {
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
    Referer: "https://store.kyobobook.co.kr/bestseller/online/weekly/domestic?page=1&pcMode=on",
  });
  assert(response.ok, `KYOBO_KR:HTTP_${response.status}`);
  let bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes);
  const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  const rows = payload?.data?.bestSeller;
  assert(Array.isArray(rows) && rows.length === 20, `KYOBO_KR:COUNT_${rows?.length}`);
  assert(rows.every((item, index) => Number(item.rowNum) === index + 1 && Number(item.prstRnkn) === index + 1), "KYOBO_KR:RANK_SEQUENCE");
  assert(rows.every((item) => /^(?:978|979)[0-9]{10}$/u.test(String(item.cmdtCode ?? ""))), "KYOBO_KR:ISBN");
  return { http: response.status, count: rows.length, firstRank: Number(rows[0].prstRnkn), lastRank: Number(rows.at(-1).prstRnkn) };
}

function discoverReadingsArticle(html) {
  const matches = [...html.matchAll(/href=["']([^"']*\/news\/our-[a-z]+-20\d{2}-bestsellers)["']/giu)].map((m) => m[1]);
  const href = [...new Set(matches)][0];
  return href ? new URL(href, "https://www.readings.com.au").toString() : null;
}

async function probeReadings() {
  const discoveryUrls = [
    "https://www.readings.com.au/news/categories/australian-fiction",
    "https://www.readings.com.au/news/categories/non-fiction",
  ];
  let articleUrl = null;
  let discoveryHttp = null;
  for (const url of discoveryUrls) {
    const { response, text } = await fetchText(url, {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-AU,en;q=0.9",
    });
    discoveryHttp = response.status;
    if (!response.ok) continue;
    articleUrl = discoverReadingsArticle(text);
    if (articleUrl) break;
  }
  assert(articleUrl, "READINGS_AU:ARTICLE_NOT_FOUND");
  const { response, text } = await fetchText(articleUrl, {
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-AU,en;q=0.9",
  });
  assert(response.ok, `READINGS_AU:HTTP_${response.status}`);
  const ranks = [...text.matchAll(/<strong\b[^>]*>\s*([1-9]|1[0-9]|20)\.\s*<\/strong>/giu)].map((m) => Number(m[1]));
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
  assert(uniqueRanks.length === 20 && uniqueRanks.every((rank, index) => rank === index + 1), `READINGS_AU:RANKS_${uniqueRanks.length}`);
  const isbns = [...text.matchAll(/\/product\/((?:978|979)[0-9]{10})\//gu)].map((m) => m[1]);
  const uniqueIsbns = [...new Set(isbns)];
  assert(uniqueIsbns.length >= 20, `READINGS_AU:ISBN_COUNT_${uniqueIsbns.length}`);
  return { discoveryHttp, http: response.status, articleUrl, rankCount: uniqueRanks.length, uniqueIsbns: uniqueIsbns.length };
}

const probes = [
  ["amazon-us", () => probeAmazon("AMAZON_US", "https://www.amazon.com/Best-Sellers-Books/zgbs/books")],
  ["amazon-uk", () => probeAmazon("AMAZON_UK", "https://www.amazon.co.uk/Best-Sellers-Books/zgbs/books")],
  ["ibs-it", probeIbs],
  ["rakuten-jp", probeRakuten],
  ["kyobo-kr", probeKyobo],
  ["readings-au", probeReadings],
];

const results = [];
for (const [source, run] of probes) {
  try {
    const evidence = await run();
    results.push({ source, status: "pass", evidence });
  } catch (error) {
    results.push({
      source,
      status: "fail",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
if (results.some((row) => row.status === "fail")) process.exitCode = 1;
