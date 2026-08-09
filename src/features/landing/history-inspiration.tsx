import Image from "next/image";

export function HistoryInspiration() {
  return (
    <section
      className="landing-history"
      id="hikayenin-yolculugu"
      aria-labelledby="history-heading"
    >
      <div className="landing-history__semantic">
        <h2 id="history-heading">Her şey bir “ilk” ile başlar.</h2>
        <p>
          Binlerce yıldır birileri ilk cümleyi yazıyor. Birileri ona yeniden bakıyor.
          Birileri ona inanıyor. Ve bazı hikâyeler başladıkları yerden çok daha uzağa gidiyor.
        </p>

        <h3>Enheduanna</h3>
        <p>
          MÖ 23. yüzyıl · Yaz. Bir yazar, adını eserinin yanında bıraktı.
          Binlerce yıl geçti. Adı hâlâ okunuyor.
        </p>

        <h3>Zenodotos</h3>
        <p>
          MÖ 3. yüzyıl · Geliştir. Birisi yazılmış bir metne yeniden baktı.
          Çünkü bazen bir eser, ikinci bir bakışla daha da güçlenir.
        </p>

        <h3>Cambridge University Press</h3>
        <p>
          1534 · İnan. Bir eserin dünyaya ulaşması için birilerinin ona inanması gerekiyordu.
          Yazarın yolculuğuna yayıncı da katıldı.
        </p>

        <h3>Hikâye perdeye çıktı.</h3>
        <p>
          1895 · Hayata geçir. Hikâyeler artık yalnızca okunmuyordu. İzlenmeye de başlandı.
          Bir eser, başladığı yerde kalmak zorunda değildir.
        </p>

        <h3>2026 · Şimdi sıra sende.</h3>
        <p>
          Bugünün ilk cümlesi, yarının kitabı olabilir. Bir okur onu ilk kez keşfedebilir.
          Bir editör onu geliştirebilir. Bir yayınevi ona inanabilir.
          Ve bir gün o hikâye başladığından çok daha uzağa gidebilir.
        </p>
      </div>

      <figure className="landing-history__reference" aria-hidden="true">
        <Image
          src="/landing/history/history-journey-final.webp"
          alt=""
          width={1492}
          height={1054}
          sizes="100vw"
          unoptimized
        />
      </figure>
    </section>
  );
}
