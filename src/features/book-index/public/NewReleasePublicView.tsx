import type { TurkeyNewReleaseRow } from "@/lib/book-index/new-releases";

import { BookIndexSectionNav } from "./BookIndexSectionNav";
import { NewReleaseFilterTable } from "./NewReleaseFilterTable";

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
      <BookIndexSectionNav current="new-releases" />
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Yeni Çıkanlar</span>
        <h1>Yeni Çıkan Kitaplar</h1>
        <p>
          Türkiye&apos;deki kitap satış kanallarının kendi “yeni çıkan” ve
          “yeni gelen” listelerinde yer verdiği kitapları tek yerde gösteriyoruz.
          İlkOku bu kitaplara yeni bir sıra veya puan vermez.
        </p>
        <p className={styles.freshness}>
          {sourceCount} doğrulanmış kitap satış kanalı · {rows.length} güncel kayıt
          {latestObservedAt && latestObservedAtLabel ? (
            <>
              {" · Son veri güncellemesi: "}
              <time dateTime={latestObservedAt.toISOString()}>
                {latestObservedAtLabel}
              </time>
            </>
          ) : null}
        </p>
      </header>

      <section className={styles.section} id="liste">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Türkiye</span>
            <h2>Kitap satış kanallarındaki yeni çıkan kitaplar</h2>
            <p>
              Kayıtlar kitap satış kanallarının kendi yeni çıkanlar listelerindeki konuma göre
              gösterilir. Tüm kitap satış kanalları görünümünde önce 1., sonra 2., sonra 3. konumdaki
              kayıtlar gelir; eşit konumlarda kitap satış kanalı adı yalnız sabit gösterim sırası
              için kullanılır. Bir kitap satış kanalı seçildiğinde o kanalın kendi liste
              sırası korunur. Bu değer satış sırası değildir ve kitap satış kanalları arasında
              ortak bir İlkOku sıralaması oluşturmaz.
            </p>
          </div>
        </div>

        <NewReleaseFilterTable rows={rows} />
      </section>

      <section
        className={styles.explainer}
        aria-labelledby="new-release-methodology"
      >
        <span className={styles.eyebrow}>Metodoloji</span>
        <h2 id="new-release-methodology">“Yeni çıkan” nasıl belirleniyor?</h2>
        <p>
          Bir kitap yalnızca kitap satış kanalı onu kendi yeni çıkan, yeni gelen veya
          eşdeğer native listesinde gösteriyorsa bu sayfaya alınır. İlkOku katalog
          eklenme tarihinden tahmin üreterek kitaba “yeni” etiketi vermez.
        </p>
        <p>
          Aynı kitap farklı kitap satış kanallarında doğrulanmış biçimde eşleşmişse kitap satış kanalları
          aynı kayıtta birlikte gösterilebilir. Emin olunmayan eşleşmeler
          birleştirilmez.
        </p>
      </section>
    </main>
  );
}
