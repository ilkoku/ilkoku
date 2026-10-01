import type { GlobalBestsellerReadModel } from "@/lib/book-index/global-public-read-model";
import type { BookIndexSourceListSnapshot } from "@/lib/book-index/public-read-model";

import { BookIndexSectionNav } from "./BookIndexSectionNav";
import styles from "./BookIndexPublicView.module.css";

const periodLabel: Record<string, string> = {
  live: "Güncel",
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
  yearly: "Yıllık",
};

function formattedObservedAt(value: Date | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function listPeriod(list: BookIndexSourceListSnapshot) {
  return periodLabel[list.period] ?? list.period;
}

export function GlobalBestsellerView({
  model,
}: {
  model: GlobalBestsellerReadModel;
}) {
  const observedAtLabel = formattedObservedAt(model.latestObservedAt);
  const currentYear = new Date().getFullYear();

  const combinedRows = model.lists
    .flatMap((list, sourceIndex) =>
      list.availability === "available"
        ? list.items.map((item) => ({
            ...item,
            listCode: list.listCode,
            sourceName: list.sourceName,
            period: listPeriod(list),
            sourceIndex,
          }))
        : [],
    )
    .sort((a, b) => a.rank - b.rank || a.sourceIndex - b.sourceIndex);

  return (
    <main className={styles.page}>
      <BookIndexSectionNav current="global" />
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Dünya</span>
        <h1>Dünyada Çok Satan Kitaplar {currentYear}</h1>
        <p>
          Farklı ülkelerdeki doğrulanmış çok satan kitap listelerini kitap satış kanalı bazında
          gösteriyoruz. Her kitap satış kanalının kendi sıra numarası ve kendi yayın dönemi
          korunur; İlkOku ülkeler arasında ortak bir dünya sırası
          veya bileşik puan üretmez.
        </p>
        {model.latestObservedAt && observedAtLabel ? (
          <p className={styles.freshness}>
            Son veri güncellemesi:{" "}
            <time dateTime={model.latestObservedAt.toISOString()}>
              {observedAtLabel}
            </time>
          </p>
        ) : null}
      </header>

      <section className={styles.section} id="global-ranking">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Ülkeler ve kitap satış kanalları</span>
            <h2>Dünya Çok Satan Kitaplar Sıralaması</h2>
            <p>
              Tüm ülke listeleri tek tabloda birleştirilir. Aynı sıra numarasındaki
              kitaplar aynı blokta gösterilir; sıra numarası yalnız bloğun ilk
              satırında yazılır. Kitap adının yanında parantez içinde Türkçe karşılığı
              gösterilir. Türkiye&apos;deki kitap satış kanallarında doğrulanmış bir yayın adı varsa o ad
              kullanılır; yoksa yalnızca başlığın Türkçe anlamı verilir. Türkçe anlamı
              resmî yayın adı olarak değerlendirilmez. Her kitap satış kanalının kendi sırası korunur.
            </p>
          </div>
        </div>

        {combinedRows.length ? (
          <div className={styles.tableScroll}>
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>Kitap</th>
                  <th>Yazar</th>
                  <th>Ülke / Kitap satış kanalı</th>
                  <th>Dönem</th>
                </tr>
              </thead>
              <tbody>
                {combinedRows.map((row, index) => {
                  const startsRankGroup =
                    index === 0 || combinedRows[index - 1]?.rank !== row.rank;

                  return (
                    <tr
                      className={startsRankGroup && index > 0 ? styles.rankGroupStart : undefined}
                      key={`${row.listCode}-${row.rank}-${row.isbn13 ?? row.isbn10 ?? row.productUrl}`}
                    >
                      <td className={styles.rankCell}>
                        {startsRankGroup ? row.rank : ""}
                      </td>
                      <td className={styles.titleCell}>
                        {(row.listCode === "pubhub-dk-ebooks-weekly" ||
                          row.listCode === "forlaggare-se-fiction-weekly" ||
                          row.listCode === "globe-mail-ca-hardcover-fiction-weekly" ||
                          row.listCode === "abc-gfk-es-fiction-weekly") ? (
                          <strong>
                            {row.title}
                            {row.turkishTitle ? ` (${row.turkishTitle})` : ""}
                          </strong>
                        ) : (
                          <a
                            href={row.productUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <strong>
                              {row.title}
                              {row.turkishTitle ? ` (${row.turkishTitle})` : ""}
                            </strong>
                          </a>
                        )}
                      </td>
                      <td>{row.authorName ?? "Yazar bilgisi doğrulanmadı"}</td>
                      <td className={styles.sourceCell}>{row.sourceName}</td>
                      <td>{row.period}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.explainer}>
            <span className={styles.eyebrow}>Veri durumu</span>
            <h2>Doğrulanmış güncel dünya verisi bekleniyor</h2>
            <p>
              Listeler düzenli olarak kontrol ediliyor; doğrulanmış güncel veri
              oluşmadan sıralama tahmin edilmiyor.
            </p>
          </div>
        )}
      </section>

      <section className={styles.explainer} aria-labelledby="global-bestseller-methodology">
        <span className={styles.eyebrow}>Metodoloji</span>
        <h2 id="global-bestseller-methodology">
          Dünya çok satan listeleri nasıl gösteriliyor?
        </h2>
        <p>
          Amazon ABD, Amazon UK, Amazon Fransa, Amazon İspanya, Amazon Kanada,
          Amazon Brezilya, IBS İtalya, Rakuten Books Japonya, Kyobo Güney Kore, Readings Avustralya,
          De Bestseller 60 Hollanda, Kirjakauppaliitto Finlandiya, Publizon Pubhub Danimarka,
          Svenska Förläggareföreningen İsveç, ABC Cultural / GfK-NIQ İspanya, The Globe and Mail Kanada ve SPIEGEL Almanya listeleri tek tabloda birlikte gösterilir. Danimarka satırları
          Publizon&apos;un haftalık e-kitap Top 10 listesini, İsveç satırları Svenska Förläggareföreningen&apos;in
          haftalık kurgu Top 5 listesini, İspanya satırları ABC Cultural&apos;ın GfK-NIQ verisine dayalı haftalık kurgu Top 10 listesini,
          Kanada satırları The Globe and Mail&apos;in haftalık Hardcover Fiction Top 10 listesini,
          Almanya satırları SPIEGEL&apos;in haftalık kurgu hardcover listesini temsil eder. Aynı sıra
          numarasındaki kayıtlar aynı blokta gruplanır; günlük, haftalık, aylık
          veya güncel dönem bilgileri ilgili kitap satış kanalının yayımladığı biçimde korunur.
        </p>
        <p>
          Bu sayfa ülkeler arası satış adetlerini karşılaştırmaz ve tek bir
          dünya satış sırası oluşturmaz. Soldaki sıra, her kitap satış kanalının kendi yayımladığı
          sıra numarasını temsil eder; aynı sıradaki farklı ülke kayıtları birlikte
          gösterilir.
        </p>
      </section>
    </main>
  );
}
