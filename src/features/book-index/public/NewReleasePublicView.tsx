import Link from "next/link";

import type { TurkeyNewReleaseRow } from "@/lib/book-index/new-releases";

import styles from "./BookIndexPublicView.module.css";

function formattedObservedAt(value: Date | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export function NewReleasePublicView({
  rows,
}: {
  rows: TurkeyNewReleaseRow[];
}) {
  const latestObservedAt = rows.reduce<Date | null>(
    (latest, row) =>
      !latest || row.latestObservedAt.getTime() > latest.getTime()
        ? row.latestObservedAt
        : latest,
    null,
  );
  const latestObservedAtLabel = formattedObservedAt(latestObservedAt);
  const sourceCount = new Set(
    rows.flatMap((row) => row.sources.map((source) => source.sourceCode)),
  ).size;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Yeni Çıkanlar</span>
        <h1>Yeni Çıkan Kitaplar</h1>
        <p>
          Türkiye&apos;deki kitap satış kaynaklarının kendi “yeni çıkan” ve
          “yeni gelen” listelerinde yer verdiği kitapları tek yerde gösteriyoruz.
          İlkOku bu kitaplara yeni bir sıra veya puan vermez.
        </p>
        <p className={styles.freshness}>
          {sourceCount} doğrulanmış kaynak · {rows.length} güncel kayıt
          {latestObservedAt && latestObservedAtLabel ? (
            <>
              {" · Son veri güncellemesi: "}
              <time dateTime={latestObservedAt.toISOString()}>
                {latestObservedAtLabel}
              </time>
            </>
          ) : null}
        </p>
        <Link className={styles.backLink} href="/en-cok-satanlar">
          ← Kitap Endeksi ana sayfası
        </Link>
      </header>

      <section className={styles.section} id="liste">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Türkiye</span>
            <h2>Kaynakların yeni çıkan kitapları</h2>
            <p>
              Kayıtlar kitap adına göre alfabetik gösterilir. Kaynak sütunundaki
              sayı, kitabın ilgili sitenin kendi yeni çıkanlar listesindeki konumudur.
              Bu değer satış sırası değildir ve kaynaklar arasında ortak bir İlkOku
              sıralaması oluşturmaz.
            </p>
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.newReleaseTable}>
            <thead>
              <tr>
                <th scope="col">Kitap</th>
                <th scope="col">Yazar</th>
                <th scope="col">Yayınevi</th>
                <th scope="col">Kaynak · listedeki konum</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.rowKey}>
                    <td className={styles.titleCell}>
                      <strong>{row.title}</strong>
                    </td>
                    <td>{row.authorName ?? "—"}</td>
                    <td>{row.publisherName ?? "—"}</td>
                    <td className={styles.newReleaseSourcesCell}>
                      {row.sources.map((source) => (
                        <span
                          className={styles.newReleaseSourceTag}
                          key={source.sourceCode}
                        >
                          {source.sourceName}: {source.position}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={styles.emptyState} colSpan={4}>
                    Yeni çıkan kitap verileri hazırlanıyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className={styles.explainer}
        aria-labelledby="new-release-methodology"
      >
        <span className={styles.eyebrow}>Metodoloji</span>
        <h2 id="new-release-methodology">“Yeni çıkan” nasıl belirleniyor?</h2>
        <p>
          Bir kitap yalnızca kaynak site onu kendi yeni çıkan, yeni gelen veya
          eşdeğer native listesinde gösteriyorsa bu sayfaya alınır. İlkOku katalog
          eklenme tarihinden tahmin üreterek kitaba “yeni” etiketi vermez.
        </p>
        <p>
          Aynı kitap farklı kaynaklarda doğrulanmış biçimde eşleşmişse kaynaklar
          aynı kayıtta birlikte gösterilebilir. Emin olunmayan eşleşmeler
          birleştirilmez.
        </p>
      </section>
    </main>
  );
}
