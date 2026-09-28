import assert from "node:assert/strict";
import test from "node:test";

import {
  pandoraBookIndexAdapter,
  parsePandoraNewReleases,
  sortPandoraNewReleasesNative,
} from "../src/lib/book-index/sources/pandora.ts";

function row({
  id,
  title,
  date,
  active,
  publisher,
  author = null,
  language = 1,
  ean = null,
}) {
  return {
    id,
    adi: title,
    yazar: author,
    yayinci: publisher,
    yayintarih: date,
    aktif: active,
    dil: language,
    dili: language === 1 ? "Türkçe" : "English",
    ean: ean ?? `978${String(id).padStart(10, "0").slice(-10)}`,
    fiyat: 100 + id,
    gorselUrl: `https://cdn.pandora.com.tr/images/urun/${id}/${id}b.jpg`,
    yeniUrun: "yeniUrun",
  };
}

function nativePayload(books = fixtureBooks()) {
  return {
    books,
    categoryId: "yenikitaplar",
    categoryName: "Yeni Kitaplar",
    language: "1",
  };
}

function fixtureBooks() {
  const priority = [
    row({ id: 1, title: "A1", date: "2026-09-28T10:00:00", active: 5, publisher: "A" }),
    row({ id: 2, title: "A2", date: "2026-09-28T09:00:00", active: 5, publisher: "A" }),
    row({ id: 3, title: "B1", date: "2026-09-28T08:00:00", active: 5, publisher: "B" }),
    row({ id: 4, title: "B2", date: "2026-09-28T07:00:00", active: 5, publisher: "B" }),
    row({ id: 5, title: "Older active five", date: "2026-09-20T12:00:00", active: 5, publisher: "C" }),
    row({ id: 6, title: "Newer active four", date: "2026-09-29T12:00:00", active: 4, publisher: "D" }),
  ];

  const filler = Array.from({ length: 34 }, (_, index) =>
    row({
      id: 100 + index,
      title: `Filler ${index + 1}`,
      date: `2020-01-${String((index % 28) + 1).padStart(2, "0")}T12:00:00`,
      active: 0,
      publisher: `Filler Publisher ${index % 3}`,
    }),
  );

  return [...priority, ...filler];
}

test("Pandora new releases reproduce native smart order before rank assignment", () => {
  const sorted = sortPandoraNewReleasesNative(fixtureBooks());
  assert.deepEqual(
    sorted.slice(0, 6).map((book) => book.id),
    [1, 3, 2, 4, 5, 6],
  );
});

test("Pandora new-release parser preserves native positions and requires an explicit limit", () => {
  const result = parsePandoraNewReleases(nativePayload(), 6);

  assert.deepEqual(
    result.books.map((book) => book.sourceExternalId),
    ["1", "3", "2", "4", "5", "6"],
  );
  assert.deepEqual(
    result.books.map((book) => book.rank),
    [1, 2, 3, 4, 5, 6],
  );
  assert.equal(result.books[0]?.authorName, null);
  assert.equal(result.books[0]?.publisherName, "A");
  assert.equal(result.books[0]?.currency, "TRY");
  assert.match(result.books[0]?.productUrl ?? "", /\/kitap\/a1\/1$/u);

  assert.throws(
    () => parsePandoraNewReleases(nativePayload(), 0),
    /BOOK_INDEX_PANDORA_NEW_RELEASE_LIMIT_INVALID/u,
  );
});

test("Pandora new-release parser fails closed on language drift and duplicate identity", () => {
  const wrongLanguage = fixtureBooks();
  wrongLanguage[0] = { ...wrongLanguage[0], dil: 2 };
  assert.throws(
    () => parsePandoraNewReleases(nativePayload(wrongLanguage), 6),
    /BOOK_INDEX_PANDORA_NEW_RELEASE_INVALID_ITEM/u,
  );

  const duplicateKey = fixtureBooks();
  duplicateKey[2] = { ...duplicateKey[2], ean: duplicateKey[0].ean };
  assert.throws(
    () => parsePandoraNewReleases(nativePayload(duplicateKey), 6),
    /BOOK_INDEX_PANDORA_NEW_RELEASE_DUPLICATE_SOURCE_KEY/u,
  );
});

test("Pandora new-release parser rejects malformed or undersized native payloads", () => {
  assert.throws(
    () => parsePandoraNewReleases([], 1),
    /BOOK_INDEX_PANDORA_NEW_RELEASE_INVALID_RESPONSE/u,
  );
  assert.throws(
    () => parsePandoraNewReleases(nativePayload([]), 1),
    /BOOK_INDEX_PANDORA_NEW_RELEASE_RESULT_TOO_SMALL/u,
  );
  assert.throws(
    () => parsePandoraNewReleases({ ...nativePayload(), categoryId: "other" }, 1),
    /BOOK_INDEX_PANDORA_NEW_RELEASE_NATIVE_LIST_MISMATCH/u,
  );
});

test("Pandora new-release collector is disabled by configuration and requires an explicit native limit", async () => {
  await assert.rejects(
    () =>
      pandoraBookIndexAdapter.collect({
        listCode: "pandora-tr-new-releases",
        sourceUrl: "https://www.pandora.com.tr/Yeni_Kitaplar/Turkce",
        observedAt: new Date("2026-09-29T00:00:00Z"),
        maxRank: null,
      }),
    /BOOK_INDEX_PANDORA_NEW_RELEASE_LIMIT_NOT_CONFIGURED/u,
  );

  await assert.rejects(
    () =>
      pandoraBookIndexAdapter.collect({
        listCode: "pandora-tr-new-releases",
        sourceUrl: "https://www.pandora.com.tr/Yeni_Kitaplar/Ingilizce",
        observedAt: new Date("2026-09-29T00:00:00Z"),
        maxRank: 6,
      }),
    /BOOK_INDEX_PANDORA_NEW_RELEASE_SOURCE_URL_MISMATCH/u,
  );
});

test("Pandora new-release collector calls the verified first-party API only after scope is configured", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify(nativePayload()), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const result = await pandoraBookIndexAdapter.collect({
      listCode: "pandora-tr-new-releases",
      sourceUrl: "https://www.pandora.com.tr/Yeni_Kitaplar/Turkce",
      observedAt: new Date("2026-09-29T00:00:00Z"),
      maxRank: 6,
    });

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0]?.url,
      "https://www.pandora.com.tr/api/yenikitaplar?dil=1",
    );
    assert.equal(result.books.length, 6);
    assert.deepEqual(
      result.books.map((book) => book.rank),
      [1, 2, 3, 4, 5, 6],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
