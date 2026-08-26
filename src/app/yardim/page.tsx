import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };
type Faq = {
  question?: string;
  answer?: string;
  category?: string;
  audience?: string;
  position?: number;
};

const audienceLabels: Record<string, string> = {
  all: "Herkes için",
  reader: "Okuyucular için",
  writer: "Yazarlar için",
  editor: "Editörler için",
  publisher: "Yayınevleri için",
};

const rolePaths = [
  {
    eyebrow: "Okur",
    title: "Yeni eserler keşfetmek istiyorum",
    description: "Keşfe açık eserleri, yazarları ve türleri incele; okumaya geçtiğinde üyelik akışından devam et.",
    href: "/eserler",
    action: "Eserleri keşfet",
  },
  {
    eyebrow: "Yazar",
    title: "Eserimi İlkOku'ya taşımak istiyorum",
    description: "Taslak oluşturma, keşfe açma, okur geri bildirimi ve editör incelemesi yolculuğunu gör.",
    href: "/yazarlar-icin",
    action: "Yazar yolculuğunu gör",
  },
  {
    eyebrow: "Editör",
    title: "Editör olarak katkı sunmak istiyorum",
    description: "Genel Editör Havuzu, iki bağımsız görüş modeli ve profesyonel değerlendirme standardını incele.",
    href: "/editorler-icin",
    action: "Editör modelini incele",
  },
  {
    eyebrow: "Yayınevi",
    title: "Yeni yazar ve eser keşfetmek istiyorum",
    description: "Yayınevi keşif katmanının hangi sinyalleri gösterdiğini ve yetkili erişimin nasıl ilerlediğini öğren.",
    href: "/yayinevleri-icin",
    action: "Yayınevi keşfini incele",
  },
] as const;

const supportPaths = [
  {
    eyebrow: "Süreç",
    title: "İlkOku nasıl çalışır?",
    description: "Eserin fikirden keşfe, editör görüşüne ve yayınevi görünürlüğüne uzanan yolunu tek akışta gör.",
    href: "/nasil-calisir",
  },
  {
    eyebrow: "Editoryal güven",
    title: "Editoryal Standartlar",
    description: "İki bağımsız görüşün hangi ölçütlerle üretildiğini ve yazarın yaratıcı kararının nasıl korunduğunu incele.",
    href: "/editoryal-standartlar",
  },
  {
    eyebrow: "Güvenli keşif",
    title: "İçerik ve Yaş Politikası",
    description: "İçerik sınıflandırmasının doğru eserle doğru okur beklentisini nasıl buluşturduğunu öğren.",
    href: "/icerik-ve-yas-politikasi",
  },
  {
    eyebrow: "Topluluk",
    title: "Topluluk Kuralları",
    description: "Yapıcı yorum, güvenli katılım ve ihlal bildirim yollarının nasıl çalıştığını gör.",
    href: "/topluluk-kurallari",
  },
  {
    eyebrow: "Eser güveni",
    title: "Telif Bildirimi",
    description: "İzinsiz kullanım şüphesinde hangi kayıt ve bilgilerle düzenli bildirim yapabileceğini öğren.",
    href: "/telif-bildirimi",
  },
  {
    eyebrow: "Editör keşfi",
    title: "Doğrulanmış editörleri keşfet",
    description: "Gerçek ve doğrulanmış editör profilleri yayınlandıkça uzmanlıklarını ve çalışma yaklaşımlarını incele.",
    href: "/editorler",
  },
] as const;

export const metadata: Metadata = {
  title: "Yardım Merkezi | İlkOku",
  description: "İlkOku'da okur, yazar, editör ve yayınevi olarak doğru adıma ulaşın; süreç, güven, telif ve sık sorulan sorular için yardım yollarını keşfedin.",
  alternates: { canonical: "/yardim" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/yardim",
    title: "Yardım Merkezi | İlkOku",
    description: "İlkOku'da yapmak istediğiniz işe göre doğru yardım ve keşif yoluna ulaşın.",
  },
};

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  let items: Faq[] = [];
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'faq' AND status = 'published'
      ORDER BY updatedAt ASC
      LIMIT 300
    `;
    items = rows
      .map((row) => {
        try {
          return JSON.parse(row.valueJson) as Faq;
        } catch {
          return {};
        }
      })
      .filter((item) => item.question && item.answer)
      .sort((a, b) => {
        const positionDiff = (a.position ?? 0) - (b.position ?? 0);
        if (positionDiff !== 0) return positionDiff;
        return (a.category || "Genel").localeCompare(b.category || "Genel", "tr");
      });
  } catch {
    items = [];
  }

  const categories = Array.from(new Set(items.map((item) => item.category || "Genel")));
  const faqSchema = items.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <main className="help-page">
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
        />
      ) : null}

      <header className="help-hero help-container">
        <span className="help-eyebrow">İlkOku destek ve yönlendirme merkezi</span>
        <h1>Ne yapmak istiyorsun?</h1>
        <p>
          Yardımı boş bir SSS listesinde aratmak yerine amacını seç. Seni eser keşfine, yazar yolculuğuna, editör modeline, yayınevi keşfine veya ihtiyaç duyduğun güven sayfasına doğrudan bağlayalım.
        </p>
      </header>

      <section className="help-section help-container" aria-labelledby="rol-yardimi-basligi">
        <div className="help-section-heading">
          <span>Rolünü seç</span>
          <h2 id="rol-yardimi-basligi">Doğru başlangıç noktasına git</h2>
          <p>Her rol için en sık ihtiyaç duyulan ilk adımı doğrudan ilgili çalışan yüzeye bağlıyoruz.</p>
        </div>
        <div className="help-role-grid">
          {rolePaths.map((item) => (
            <Link className="help-role-card" href={item.href} key={item.href}>
              <span>{item.eyebrow}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <strong>{item.action} <span aria-hidden="true">→</span></strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="help-section help-container" aria-labelledby="hizli-yardim-basligi">
        <div className="help-section-heading">
          <span>Süreç ve güven</span>
          <h2 id="hizli-yardim-basligi">Soruna göre doğru sayfayı aç</h2>
          <p>Platformun işleyişi, editoryal güven, topluluk, içerik sınıflandırması ve telif için ayrı ve doğrudan yollar bulunur.</p>
        </div>
        <div className="help-link-grid">
          {supportPaths.map((item) => (
            <Link className="help-card" href={item.href} key={item.href}>
              <span>{item.eyebrow}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <strong>İncele <span aria-hidden="true">→</span></strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="help-section help-container" aria-labelledby="sss-basligi">
        <div className="help-section-heading">
          <span>Sık sorulan sorular</span>
          <h2 id="sss-basligi">Yayınlanmış yardım cevapları</h2>
          <p>İçerik yönetiminden yayınlanan SSS kayıtları varsa burada rol ve kategori bilgisiyle gösterilir.</p>
        </div>

        {items.length === 0 ? (
          <div className="help-faq-empty">
            <strong>Henüz yayınlanmış SSS kaydı yok.</strong>
            <p>
              Yardım Merkezi bu yüzden boş kalmıyor: yukarıdaki rol ve süreç yolları seni doğrudan çalışan sayfalara götürüyor. Bunlarda yanıt bulamazsan destek ekibine ulaşabilirsin.
            </p>
            <a href="mailto:destek@ilkoku.com">destek@ilkoku.com <span aria-hidden="true">→</span></a>
          </div>
        ) : (
          <div className="help-faq-groups">
            {categories.map((category) => (
              <section className="help-faq-group" key={category}>
                <h3>{category}</h3>
                <div className="help-faq-list">
                  {items.filter((item) => (item.category || "Genel") === category).map((item, index) => (
                    <details key={`${category}-${index}`}>
                      <summary>{item.question}</summary>
                      <div className="help-faq-answer">
                        <span>{audienceLabels[item.audience || "all"] || audienceLabels.all}</span>
                        <p>{item.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="help-contact help-container" aria-labelledby="destek-basligi">
        <span className="help-eyebrow">Doğrudan destek</span>
        <h2 id="destek-basligi">Hâlâ doğru yolu bulamadın mı?</h2>
        <p>Hangi rolü kullandığını, hangi sayfada olduğunu ve ne yapmaya çalıştığını kısaca yazarak destek ekibine ulaşabilirsin.</p>
        <a href="mailto:destek@ilkoku.com">Destek ekibine yaz <span aria-hidden="true">→</span></a>
      </section>
    </main>
  );
}
