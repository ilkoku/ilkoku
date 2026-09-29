# Penguen Kitabevi Book Index research note

Date: **29 Eylül 2026**

Status: **researching / native ranked source not verified**

## Verified public surface

Current public book catalog:

- `https://penguenkitabevi.com/kitaplar`
- 71 book records were exposed by the public catalog at verification time.
- Pagination shows 12 records per page.
- Product URLs use the stable public shape `/kitap/<slug>`.
- The catalog exposes category/editorial selections such as Roman, Çocuk,
  Özel Fırsatlar and publisher/editor selections.

## What was not verified

The current public catalog did **not** expose a native book ranking control or
route for:

- Çok Satanlar;
- Yeni Çıkan Kitaplar;
- sales rank;
- bestseller rank;
- a period-specific native ranking.

The page had no matching `select` control; navigation was category/editorial
filtering plus pagination.

The home-page phrase **Yeni Çıkan Ürünler** is not treated as a book ranking
source because that surface includes Coffee Roastery products and is not an
isolated ranked book list.

## Product rule

The ordinary `/kitaplar` catalog order must **not** be relabeled as a sales or
bestseller rank.

Until a native ranked book surface, sanctioned feed/API, or another explicit
ranking contract is verified:

- Penguen remains `researching`;
- no Book Index list is registered;
- no production collector adapter is activated;
- no synthetic rank is generated from catalog order.

This note records the current evidence only. A future verified native ranking
may be added through a separate, source-specific validation slice.
