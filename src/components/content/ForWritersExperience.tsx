import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { EditorialBody } from "@/components/content/PublicEditorialDocument";
import { getPublicTrustPageVisual } from "@/content/public-trust-page-visuals";

type Section = { body: string; title: string };

type WriterHistoryMilestone = {
  body: string;
  first: string;
  name: string;
  period: string;
  takeaway: string;
};

const writerHistoryMilestones: readonly WriterHistoryMilestone[] = [
  {
    period: "MÖ yaklaşık 2300",
    name: "Enheduanna",
    first: "Adını tarihe bırakan ilk bilinen yazar.",
    body: "Ur'da yaşayan şair ve yüksek rahibe Enheduanna, adıyla ilişkilendirilebilen metinleri sayesinde dünya edebiyatının bilinen en eski isimli yazarı kabul ediliyor. Binlerce yıl önce kendi sesini metnin içine koyması, bugün hâlâ kim olduğunu ve ne yazdığını konuşabilmemizi sağlıyor.",
    takeaway: "Bir yazının ilk gücü, yazarının kendi cümlesine sahip çıkmasıdır.",
  },
  {
    period: "11. yüzyılın başı",
    name: "Murasaki Shikibu",
    first: "Romanın sınırlarını değiştiren bir ilk.",
    body: "Murasaki Shikibu'nun Genji'nin Hikâyesi adlı eseri, dünyanın ilk romanı olarak sıkça kabul ediliyor. Elli dört bölümlük anlatı; karakterlerin duygularını, ilişkilerini ve yıllar içindeki değişimini olağanüstü bir ayrıntıyla izleyerek kurmacanın ne kadar geniş bir dünya kurabileceğini gösterdi.",
    takeaway: "Yeni bir anlatı biçimi bazen önce tek bir yazarın onu sonuna kadar kurma cesaretidir.",
  },
  {
    period: "1818",
    name: "Mary Shelley",
    first: "Bilimkurguya kapı açan genç bir yazar.",
    body: "Frankenstein yayımlandığında Mary Shelley henüz 20 yaşındaydı. Eser bugün geniş biçimde ilk bilimkurgu romanı kabul ediliyor; bilimin imkânlarını, insanın sorumluluğunu ve yaratmanın bedelini aynı hikâyede buluşturarak sonraki kuşakların yazacağı yepyeni bir alan açtı.",
    takeaway: "Bazen bir tür, bir yazarın 'böyle bir hikâye neden olmasın?' sorusuyla başlar.",
  },
  {
    period: "1901",
    name: "Mehmet Rauf",
    first: "Türk romanında insanın iç dünyasına açılan yeni bir kapı.",
    body: "Mehmet Rauf'un Eylül'ü, Türk edebiyatının ilk psikolojik romanı kabul edilir. Roman, dış olaylardan çok karakterlerin tereddütlerini, duygusal çatışmalarını ve iç dünyalarını merkeze alarak anlatının yalnızca 'ne oldu?' sorusundan ibaret olmadığını gösterdi.",
    takeaway: "Yeni olan her zaman konu değildir; bazen insanın içine daha önce bakılmadığı kadar derin bakmaktır.",
  },
  {
    period: "1909",
    name: "Selma Lagerlöf",
    first: "Nobel Edebiyat Ödülü'nü alan ilk kadın yazar.",
    body: "Öğretmenlik yaparken yazmaya başlayan Selma Lagerlöf, 1909'da Nobel Edebiyat Ödülü'nü alan ilk kadın oldu. Kendi coğrafyasının halk anlatılarını, efsanelerini ve güçlü hayal dünyasını edebiyata taşıyarak yerel bir sesin dünyanın ortak okuma hafızasına girebileceğini gösterdi.",
    takeaway: "Bir hikâyenin doğduğu yer küçük olabilir; ulaşabileceği yer olmak zorunda değildir.",
  },
  {
    period: "1993",
    name: "Toni Morrison",
    first: "Nobel Edebiyat Ödülü'nü alan ilk Afrikalı Amerikalı kadın.",
    body: "Toni Morrison, 1993'te Nobel Edebiyat Ödülü'nü alan ilk Afrikalı Amerikalı kadın oldu. Romanlarında uzun süre edebiyatın kenarında bırakılmış deneyimleri merkeze taşıdı; hafıza, kimlik, baskı ve aidiyet üzerine kurduğu anlatılarla kimin hikâyesinin 'büyük edebiyat' sayılabileceğine dair alanı genişletti.",
    takeaway: "Sana fazla kişisel veya fazla görünmez gelen bir deneyim, tam da yazılması gereken hikâye olabilir.",
  },
  {
    period: "2006",
    name: "Orhan Pamuk",
    first: "Nobel Edebiyat Ödülü'nü alan ilk Türk yazar.",
    body: "Orhan Pamuk, 2006'da Nobel Edebiyat Ödülü'nü alan ilk Türk yazar oldu. İstanbul'u, hafızayı, kimliği ve Doğu ile Batı arasındaki gerilimi kendi anlatı dünyası içinde evrensel bir edebiyat diline dönüştürdü.",
    takeaway: "Bir yazarın başladığı şehir, hikâyesinin sınırı olmak zorunda değildir.",
  },
] as const;

const knownSections = new Set([
  "Eserini oluştur ve bölüm bölüm geliştir",
  "İçerik ve yaş sınıfını doğru seç",
  "Taslak ile yayın kararını ayrı tut",
  "Okur geri bildirimini gelişim verisi olarak kullan",
  "Profesyonel editör incelemesini ayrıca talep et",
  "Editör raporlarından sonra yaratıcı karar yazarda kalır",
  "Eser Pasaportu gelişim geçmişini kayıt altında tutar",
  "Yayınevi keşfi yayın garantisi değildir",
  "Eser üzerindeki hakların yazarda kalır",
  "İlkOku yazar için neyi garanti etmez",
  "Yazar olarak başla",
]);

function splitSections(body: string) {
  const intro: string[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      if (current) sections.push({ ...current, body: current.body.trim() });
      current = { title: line.slice(3).trim(), body: "" };
    } else if (current) current.body += `${line}\n`;
    else intro.push(line);
  }

  if (current) sections.push({ ...current, body: current.body.trim() });
  return { intro: intro.join("\n").trim(), sections };
}

function formatUpdatedAt(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(date);
}

function WriterIcon({ name }: { name: "book" | "pen" | "shield" | "readers" | "editors" | "passport" | "publisher" | "rights" }) {
  const paths = {
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23V5.5Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23V5.5Z" /></>,
    pen: <><path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" /><path d="m14.5 6.7 2.8 2.8" /></>,
    shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3 7.7 7.5 9.5 4.5-1.8 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-5" /></>,
    readers: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6" /><circle cx="17" cy="9" r="2.3" /><path d="M15.3 14.8c3.1-.7 5.1.9 5.5 4.2" /></>,
    editors: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h5M8 16h7" /><path d="m15 15 1.5 1.5L20 13" /></>,
    passport: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M9 16h6" /></>,
    publisher: <><path d="M4 20V7l8-4 8 4v13" /><path d="M8 20v-7h8v7M9 9h.01M15 9h.01" /></>,
    rights: <><path d="M12 3v18M5 6h14M7 6l-4 7h8L7 6ZM17 6l-4 7h8l-4-7ZM8 21h8" /></>,
  } as const;

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[name]}</svg>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="how-section-heading"><span>{eyebrow}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

export function ForWritersExperience({ body, summary, title, updatedAt }: { body: string; summary: string; title: string; updatedAt?: Date | string | null }) {
  const parsed = splitSections(body);
  const sectionMap = new Map(parsed.sections.map((section) => [section.title, section]));
  const extras = parsed.sections.filter((section) => !knownSections.has(section.title));
  const updatedLabel = formatUpdatedAt(updatedAt);
  const visual = getPublicTrustPageVisual("/yazarlar-icin");

  return (
    <main className="how-page for-writers-page">
      <header className="how-header">
        <div className="how-container how-header__inner">
          <Link className="how-logo" href="/" aria-label="İlkOku ana sayfa"><Image src={logo} alt="İlkOku" priority sizes="160px" /></Link>
          <nav aria-label="Herkese açık sayfalar"><Link href="/eserler">Eserler</Link><Link href="/yazarlar">Yazarlar</Link><Link href="/editorler">Editörler</Link><Link href="/yardim">Yardım</Link></nav>
          <Link className="how-header__account" href="/giris">Giriş yap</Link>
        </div>
      </header>

      <section className="how-hero writers-hero">
        <div className="how-container how-hero__grid">
          <div className="how-hero__content">
            <span className="how-eyebrow">Fikrini görünür bir eser yolculuğuna dönüştür</span>
            <h1>{title.split(/\s+/).map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}</h1>
            <p>{summary}</p>
            <div className="how-hero__actions">
              <Link className="how-button how-button--primary" href="/kayit?rol=writer">Yazar olarak başla <span aria-hidden="true">→</span></Link>
              <Link className="how-button how-button--secondary" href="#yazar-ilkleri">Yazarların ilklerini gör</Link>
            </div>
            <div className="how-hero__proof"><span><strong>Keşif</strong> okurla başlar</span><span><strong>2</strong> bağımsız editör görüşü</span><span><strong>Haklar</strong> yazarda</span></div>
            {updatedLabel ? <small>Son güncelleme: {updatedLabel}</small> : null}
          </div>
          <figure className="how-hero__visual writers-hero__visual">
            <Image src={visual.src} alt={visual.alt} fill priority sizes="(max-width: 860px) 100vw, 54vw" style={{ objectPosition: visual.focalPoint }} />
            <figcaption><span><WriterIcon name="pen" /> Yaz</span><span><WriterIcon name="readers" /> Okurla buluş</span><span><WriterIcon name="publisher" /> Keşfedil</span></figcaption>
          </figure>
        </div>
      </section>

      <nav className="how-quick-nav how-container" aria-label="Sayfa bölümleri">
        <a href="#yazar-yolculugu"><span>01</span>Yazma</a>
        <a href="#geri-bildirim"><span>02</span>Geri bildirim</a>
        <a href="#eser-pasaportu"><span>03</span>Pasaport</a>
        <a href="#haklar"><span>04</span>Haklar</a>
      </nav>

      {parsed.intro ? <section className="how-truth how-container" aria-label="Yazar için İlkOku değeri"><span><WriterIcon name="pen" /></span><div><strong>Yaz, keşfe aç, gerçek okurla buluş ve eserini yeni bakışlarla geliştir.</strong><EditorialBody body={parsed.intro} /></div></section> : null}

      <section className="writers-history" id="yazar-ilkleri" aria-labelledby="writer-history-heading">
        <div className="how-container">
          <header className="writers-history__heading">
            <span>HİKÂYENİN YOLCULUĞU · YAZARLARIN İLKLERİ</span>
            <h2 id="writer-history-heading">Her şey bir “ilk” ile başlar. Yazarlar bunu binlerce yıldır kanıtlıyor.</h2>
            <p>Bugün klasik, tür veya dönüm noktası dediğimiz eserlerin hiçbiri yazılmadan önce ortada değildi. Bir yazar ilk cümleyi kurdu, kendi sesine güvendi ve edebiyatın sınırı biraz daha genişledi.</p>
          </header>

          <div className="writers-history__grid">
            {writerHistoryMilestones.map((milestone, index) => (
              <article className="writers-history__card" key={milestone.name}>
                <div className="writers-history__meta">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{milestone.period}</strong>
                </div>
                <h3>{milestone.name}</h3>
                <h4>{milestone.first}</h4>
                <p>{milestone.body}</p>
                <div className="writers-history__takeaway">
                  <span>Yazara kalan fikir</span>
                  <p>{milestone.takeaway}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="writers-history__now">
            <div>
              <span>2026 · ŞİMDİ SIRA SENDE</span>
              <h3>Sıradaki “ilk” henüz yazılmadı.</h3>
              <p>Belki ilk tamamladığın roman, ilk kez kurduğun bir dünya, ilk kez senin sesinle anlatılan bir karakter ya da yıllardır aklında taşıdığın o hikâye. Edebiyat tarihi geriye dönüp baktığımızda “ilk”leri gösterir; yazarken ise her biri yalnızca cesaret edilmiş bir başlangıçtır.</p>
            </div>
            <div className="writers-history__now-actions">
              <Link className="how-button how-button--primary" href="/kayit?rol=writer">Kendi ilk cümlene başla <span aria-hidden="true">→</span></Link>
              <a className="how-button how-button--secondary" href="#yazar-yolculugu">İlkOku'daki yazar yolculuğunu gör</a>
            </div>
          </div>
        </div>
      </section>

      <section className="writers-workflow how-container" id="yazar-yolculugu">
        <SectionHeading eyebrow="Yazar çalışma alanı" title="Yaz, geliştir, hazır olduğunda keşfe aç." description="Taslağını kendi temponda büyüt; eserin okurla ne zaman buluşacağına sen karar ver." />
        <div className="writers-workflow__grid">
          {sectionMap.get("Eserini oluştur ve bölüm bölüm geliştir") ? <article><WriterIcon name="pen" /><h3>Bölüm bölüm geliştir; hazır olmadan görünür olmak zorunda değilsin.</h3><EditorialBody body={sectionMap.get("Eserini oluştur ve bölüm bölüm geliştir")!.body} /></article> : null}
          {sectionMap.get("İçerik ve yaş sınıfını doğru seç") ? <article><WriterIcon name="shield" /><h3>Eserini doğru okur beklentisiyle buluştur.</h3><EditorialBody body={sectionMap.get("İçerik ve yaş sınıfını doğru seç")!.body} /><Link href="/icerik-ve-yas-politikasi">İçerik ve Yaş Politikası →</Link></article> : null}
          {sectionMap.get("Taslak ile yayın kararını ayrı tut") ? <article><WriterIcon name="book" /><h3>Keşfe ne zaman çıkacağına sen karar ver.</h3><EditorialBody body={sectionMap.get("Taslak ile yayın kararını ayrı tut")!.body} /></article> : null}
        </div>
      </section>

      <section className="writers-feedback" id="geri-bildirim">
        <div className="how-container">
          <SectionHeading eyebrow="İki farklı gelişim sinyali" title="Gerçek okur tepkisiyle profesyonel editör görüşünü birlikte kullan." description="Okur eserin nasıl karşılık bulduğunu gösterir; editör ise metnine daha derin ve bağımsız profesyonel bakış kazandırır." />
          <div className="writers-feedback__grid">
            {sectionMap.get("Okur geri bildirimini gelişim verisi olarak kullan") ? <article><WriterIcon name="readers" /><span>Okur</span><h3>İlk okurlarının hangi noktada bağ kurduğunu gör.</h3><EditorialBody body={sectionMap.get("Okur geri bildirimini gelişim verisi olarak kullan")!.body} /></article> : null}
            {sectionMap.get("Profesyonel editör incelemesini ayrıca talep et") ? <article className="writers-feedback__night"><WriterIcon name="editors" /><span>Editör</span><h3>Metnine iki bağımsız profesyonel bakış ekle.</h3><EditorialBody body={sectionMap.get("Profesyonel editör incelemesini ayrıca talep et")!.body} /><Link href="/editoryal-standartlar">Editoryal Standartlar →</Link></article> : null}
          </div>
          {sectionMap.get("Editör raporlarından sonra yaratıcı karar yazarda kalır") ? <div className="writers-decision"><WriterIcon name="pen" /><div><span>Yaratıcı karar</span><h3>İki görüşü değerlendir; yaratıcı karar sende kalsın.</h3><EditorialBody body={sectionMap.get("Editör raporlarından sonra yaratıcı karar yazarda kalır")!.body} /></div></div> : null}
        </div>
      </section>

      <section className="writers-passport how-container" id="eser-pasaportu">
        <SectionHeading eyebrow="Gelişim geçmişi" title="Eserinin yalnız son hâli değil, gelişim yolculuğu da iz bıraksın." description="Eser Pasaportu oluşturma, bölüm, revizyon ve inceleme adımlarını zaman çizgisinde bir araya getirir." />
        <div className="writers-passport__grid">
          {sectionMap.get("Eser Pasaportu gelişim geçmişini kayıt altında tutar") ? <article className="writers-passport__primary"><WriterIcon name="passport" /><span>Eser Pasaportu</span><h3>Oluşturma, bölüm, revizyon ve inceleme izi aynı gelişim çizgisinde.</h3><EditorialBody body={sectionMap.get("Eser Pasaportu gelişim geçmişini kayıt altında tutar")!.body} /></article> : null}
          {sectionMap.get("Yayınevi keşfi yayın garantisi değildir") ? <article><WriterIcon name="publisher" /><span>Yayınevi keşfi</span><h3>Eserini yeni yazar arayan yayınevlerinin keşif alanına taşı.</h3><EditorialBody body={sectionMap.get("Yayınevi keşfi yayın garantisi değildir")!.body} /></article> : null}
        </div>
      </section>

      <section className="writers-rights" id="haklar">
        <div className="how-container">
          <SectionHeading eyebrow="Yaratıcı kontrol ve güven" title="Eserini görünür kılarken haklarını ve yaratıcı kararını koru." description="İlkOku görünürlük ve gelişim fırsatı oluşturur; eser üzerindeki yaratıcı karar ve hak sahipliği sende kalır." />
          <div className="writers-rights__grid">
            {sectionMap.get("Eser üzerindeki hakların yazarda kalır") ? <article><WriterIcon name="rights" /><span>Haklar</span><h3>Hakların sende kalırken eserini yeni okurlara aç.</h3><EditorialBody body={sectionMap.get("Eser üzerindeki hakların yazarda kalır")!.body} /><Link href="/telif-bildirimi">Telif Bildirimi →</Link></article> : null}
            {sectionMap.get("İlkOku yazar için neyi garanti etmez") ? <article><WriterIcon name="shield" /><span>Gerçekçi beklenti</span><h3>Fırsat alanını büyüt; sonuçları vaat yerine gerçek keşif üzerinden değerlendir.</h3><EditorialBody body={sectionMap.get("İlkOku yazar için neyi garanti etmez")!.body} /></article> : null}
          </div>
        </div>
      </section>

      {sectionMap.get("Yazar olarak başla") ? <section className="writers-start how-container"><WriterIcon name="book" /><div><span>İlk eserine başla</span><h2>İlk eser kaydını oluştur ve yolculuğunu başlat.</h2><EditorialBody body={sectionMap.get("Yazar olarak başla")!.body} /><div className="writers-start__actions"><Link className="how-button how-button--primary" href="/kayit?rol=writer">Yazar hesabı oluştur <span aria-hidden="true">→</span></Link><Link className="how-button how-button--secondary" href="/giris">Zaten hesabım var</Link></div></div></section> : null}

      {extras.length ? <section className="how-extras how-container">{extras.map((section) => <article className="how-editorial-card" key={section.title}><h2>{section.title}</h2><EditorialBody body={section.body} /></article>)}</section> : null}

      <aside className="how-related how-container" aria-label="İlkOku içinde devam et">
        <SectionHeading eyebrow="İlkOku içinde devam et" title="Yazar yolculuğunu güçlendiren diğer alanları keşfet." />
        <div className="how-related__grid">
          <Link href="/nasil-calisir"><strong>Nasıl Çalışır?</strong><span>Fikirden okur ve yayınevi keşfine uzanan eser yolculuğunu gör.</span></Link>
          <Link href="/editoryal-standartlar"><strong>Editoryal Standartlar</strong><span>İki bağımsız profesyonel görüşün esere nasıl değer kattığını öğren.</span></Link>
          <Link href="/icerik-ve-yas-politikasi"><strong>İçerik ve Yaş Politikası</strong><span>Eserini doğru okur beklentisiyle nasıl keşfe açacağını incele.</span></Link>
          <Link href="/telif-bildirimi"><strong>Telif Bildirimi</strong><span>İzinsiz kullanım şüphesinde somut kayıtla nasıl bildirim yapılacağını öğren.</span></Link>
        </div>
      </aside>

      <footer className="how-footer"><div className="how-container"><Link className="how-logo" href="/"><Image src={logo} alt="İlkOku" sizes="150px" /></Link><nav><Link href="/nasil-calisir">Nasıl Çalışır?</Link><Link href="/yazarlar-icin">Yazarlar İçin</Link><Link href="/editoryal-standartlar">Editoryal Standartlar</Link><Link href="/topluluk-kurallari">Topluluk</Link><Link href="/telif-bildirimi">Telif Bildirimi</Link></nav></div></footer>
    </main>
  );
}
