import Link from "next/link";

import { getWritingGuideEntries } from "@/lib/writing-guide-directory";
import { WRITING_CATEGORY_HUBS } from "@/lib/writing-category-hubs";

// Yazarlar için tek eğitim bölümü: kategori menüsü + her kategorinin tüm rehberleri.
// Sunucuda çizilen düz <a href> bağlantıları arama motorları için ilk HTML'de görünür.
// Sol menü yalnızca sayfa içi # bağlantılarıdır. Görünüm: education-hub.css (.writers-directory).
export function AllWritingGuidesDirectory() {
  return (
    <section className="writers-directory how-container" id="egitim" aria-labelledby="egitim-baslik">
      <header className="how-section-heading">
        <span>Eğitim</span>
        <h2 id="egitim-baslik">Yazmak istediğin alanı seç, türüne özel eğitime geç.</h2>
        <p>İlkOku Yazarlık Okulu&apos;nda her ana kategori, kendi eser türlerine ve yazarlık mantığına açılır.</p>
      </header>
      <div className="writers-directory__layout">
        <nav className="writers-directory__menu" aria-label="Eğitim kategorileri">
          <ul>
            {WRITING_CATEGORY_HUBS.map((hub) => (
              <li key={hub.slug}>
                <a href={`#rehber-${hub.slug}`}>{hub.title}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="writers-directory__list">
          {WRITING_CATEGORY_HUBS.map((hub) => (
            <article id={`rehber-${hub.slug}`} key={hub.slug}>
              <h3>
                <Link href={hub.href} prefetch={false}>{hub.title}</Link>
              </h3>
              <p>{hub.cardText}</p>
              <ul>
                {getWritingGuideEntries(hub.category, hub.href).map((guide) => (
                  <li key={guide.href}>
                    <Link href={guide.href} prefetch={false}>{guide.title}</Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
