import Link from "next/link";

const areas = [
  { href: "/icerik/ana-sayfa", title: "Ana Sayfa", description: "Hero, rol kartları, Eser Pasaportu, Neden İlkOku ve footer içerikleri." },
  { href: "/icerik/sayfalar", title: "Sayfalar", description: "Kurumsal ve bilgilendirme sayfalarının içerik yönetimi." },
  { href: "/icerik/yasal", title: "Yasal Sayfalar", description: "Kullanım şartları, gizlilik, KVKK, çerez ve telif metinleri." },
  { href: "/icerik/seo", title: "SEO", description: "SEO başlıkları, açıklamalar, canonical ve indeks ayarları." },
];

export default function ContentDashboardPage() {
  return (
    <section>
      <div className="content-page-heading">
        <h1>İçerik Yönetimi</h1>
        <p>İlkOku.com kurumsal ve pazarlama içeriklerini teknik sistem yönetiminden bağımsız yönetin.</p>
      </div>

      <div className="content-grid">
        {areas.map((area) => (
          <article className="content-card" key={area.href}>
            <h2>{area.title}</h2>
            <p>{area.description}</p>
            <Link href={area.href}>Yönet →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
