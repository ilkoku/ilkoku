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
      </header>

      <section className={styles.section} id="liste">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Türkiye</span>
            <h2>Kaynakların yeni çıkan kitapları</h2>
            <p>
              Kayıtlar kaynakların kendi yeni çıkanlar listelerindeki konuma göre
              gösterilir. Tüm siteler görünümünde önce 1., sonra 2., sonra 3. konumdaki
              kayıtlar gelir; eşit konumlarda kaynak adı yalnız sabit gösterim sırası
              için kullanılır. Bir satış sitesi seçildiğinde o sitenin kendi liste
              sırası korunur. Bu değer satış sırası değildir ve kaynaklar arasında
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
