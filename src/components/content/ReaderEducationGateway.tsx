import Link from "next/link";

import { READER_EDUCATION_CATEGORIES, readerEducationPublicPath } from "@/lib/reader-education";

export function ReaderEducationGateway() {
  return (
    <aside className="how-container py-12 sm:py-16" id="okur-egitimi" aria-labelledby="okur-egitimi-title">
      <header className="how-section-heading">
        <span>Okudukça daha fazlasını gör.</span>
        <h2 id="okur-egitimi-title">Okuma eğitimini kendi yolundan keşfet.</h2>
        <p>Bir eseri yalnızca okumayı değil; anlamayı, çözümlemeyi, sorgulamayı ve kendi yorumunu oluşturmayı öğren. Okuma alışkanlığından edebi çözümlemeye, karakter analizinden eleştiri yazmaya kadar geliştirmek istediğin alanı seç.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {READER_EDUCATION_CATEGORIES.map((category) => (
          <Link
            className="group flex min-h-64 flex-col rounded-[1.55rem] border border-white/10 bg-[#17122f] p-6 text-white shadow-[0_16px_42px_rgba(23,18,47,0.16)] transition hover:-translate-y-1 hover:border-[#8d79ef]/50 hover:shadow-[0_22px_54px_rgba(23,18,47,0.24)]"
            href={readerEducationPublicPath(category)}
            key={category.slug}
          >
            <strong className="font-serif text-2xl font-semibold leading-tight tracking-[-0.025em] text-white">{category.title}</strong>
            <p className="mt-3 text-sm leading-7 text-[#d8d2e8]">{category.shortDescription}</p>
            <em className="mt-auto pt-5 text-xs font-extrabold not-italic text-[#c7baff]">Eğitime başla <span className="inline-block transition group-hover:translate-x-1" aria-hidden="true">→</span></em>
          </Link>
        ))}
      </div>

      <div className="mb-4 mt-9 flex flex-wrap items-end justify-between gap-2 border-t border-black/[0.07] pt-7">
        <strong className="font-serif text-xl font-semibold text-[#211746]">İlkOku’da devam et</strong>
        <p className="m-0 text-sm text-[#69667e]">Eğitimden sonra platformun diğer alanlarına geç.</p>
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
