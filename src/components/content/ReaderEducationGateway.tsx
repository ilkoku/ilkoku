import Link from "next/link";

import { READER_EDUCATION_CATEGORIES, readerEducationPublicPath } from "@/lib/reader-education";

export function ReaderEducationGateway() {
  return (
    <aside className="how-reader-education how-container" id="okur-egitimi" aria-labelledby="okur-egitimi-title">
      <header className="how-section-heading">
        <span>Okudukça daha fazlasını gör.</span>
        <h2 id="okur-egitimi-title">Okuma eğitimini kendi yolundan keşfet.</h2>
        <p>Bir eseri yalnızca okumayı değil; anlamayı, çözümlemeyi, sorgulamayı ve kendi yorumunu oluşturmayı öğren. Okuma alışkanlığından edebi çözümlemeye, karakter analizinden eleştiri yazmaya kadar geliştirmek istediğin alanı seç.</p>
      </header>

      <div className="how-reader-education__grid">
        {READER_EDUCATION_CATEGORIES.map((category) => (
          <Link className="how-reader-education__card" href={readerEducationPublicPath(category)} key={category.slug}>
            <span className="how-reader-education__number">{category.number}</span>
            <strong>{category.title}</strong>
            <p>{category.shortDescription}</p>
            <em>Eğitime başla <span aria-hidden="true">→</span></em>
          </Link>
        ))}
      </div>

      <div className="how-reader-education__platform-label">
        <span>İlkOku’da devam et</span>
        <p>Eğitimden sonra platformun diğer alanlarına geç.</p>
      </div>
      <div className="how-related__grid">
        <Link href="/kayit?rol=reader"><strong>Okur olarak katıl</strong><span>Yeni eserleri okumaya hazır olduğunda üyelikle devam et.</span></Link>
        <Link href="/yazarlar-icin"><strong>Yazarlar İçin</strong><span>Eserini nasıl geliştirip yayımlayacağını incele.</span></Link>
        <Link href="/editorler"><strong>Editörleri incele</strong><span>Herkese açık editör profillerini ve uzmanlıklarını gör.</span></Link>
        <Link href="/yardim"><strong>Yardım Merkezi</strong><span>Hesap, roller ve platform kullanımı hakkında yanıt bul.</span></Link>
      </div>
    </aside>
  );
}
