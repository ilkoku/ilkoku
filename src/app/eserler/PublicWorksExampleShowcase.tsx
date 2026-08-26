"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const exampleWorks = [
  {
    title: "Kıyıdaki Son Işık",
    genre: "Çağdaş Roman",
    hook: "Bir sahil kasabasına dönen genç bir kadın, ailesinin yıllardır sakladığı bir hikâyenin izini sürer.",
    detail: "Kapak · tür · tanıtım · bölüm akışı",
    className: "public-works-example__cover--violet",
  },
  {
    title: "Saat 03.17",
    genre: "Polisiye / Gerilim",
    hook: "Her gece aynı saatte gelen isimsiz mesajlar, unutulduğu sanılan bir vakayı yeniden açar.",
    detail: "Okur keşfi · yayın görünürlüğü · geri bildirim",
    className: "public-works-example__cover--midnight",
  },
  {
    title: "Gölgedeki Harita",
    genre: "Fantastik / Macera",
    hook: "Eski bir atlasın kenarına çizilmiş tek bir işaret, iki kardeşi haritalarda olmayan bir yere götürür.",
    detail: "Yazar profili · bölüm yayını · editör yolculuğu",
    className: "public-works-example__cover--lilac",
  },
] as const;

export function PublicWorksExampleShowcase() {
  const pathname = usePathname();

  if (pathname !== "/eserler") {
    return null;
  }

  return (
    <section
      className="public-works-example"
      aria-labelledby="public-works-example-title"
    >
      <div className="public-works-example__container">
        <div className="public-works-example__intro">
          <div>
            <p className="public-works-example__eyebrow">
              ÖRNEK ESER VİTRİNİ · GERÇEK YAYIN DEĞİL
            </p>
            <h2 id="public-works-example-title">
              Eserin İlkOku’da böyle görünür.
            </h2>
          </div>
          <p>
            Bu kartlar yalnızca arayüz örneğidir; gerçek yazar veya yayın verisi değildir.
            Eserinin İlkOku’da nasıl sunulacağını göstermek için hazırlanmıştır.
          </p>
        </div>

        <div className="public-works-example__grid">
          {exampleWorks.map((work) => (
            <article className="public-works-example__card" key={work.title}>
              <div className={`public-works-example__cover ${work.className}`}>
                <span>{work.genre}</span>
                <strong>{work.title}</strong>
                <small>İlkOku örnek vitrini</small>
              </div>
              <div className="public-works-example__body">
                <span className="public-works-example__badge">Örnek içerik</span>
                <h3>{work.title}</h3>
                <p>{work.hook}</p>
                <small>{work.detail}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="public-works-example__cta">
          <div>
            <strong>Sıradaki gerçek eser seninki olabilir.</strong>
            <span>
              Eserini bölüm bölüm yayımla, okurlarla buluş ve editör yolculuğunu başlat.
            </span>
          </div>
          <div className="public-works-example__actions">
            <Link className="public-works-example__primary" href="/kayit?rol=writer">
              Eserini yayınlamaya başla
            </Link>
            <Link className="public-works-example__secondary" href="/yazarlar-icin">
              Yazarlar için nasıl çalışır?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
