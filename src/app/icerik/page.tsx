import Link from "next/link";
import { cmsModules } from "@/lib/cms-modules";

export default function ContentDashboardPage() {
  const areas = cmsModules.filter((module) => module.enabled && module.href !== "/icerik");

  return (
    <section>
      <div className="content-page-heading">
        <div>
          <span>Merkez</span>
          <h1>İçerik Yönetimi</h1>
          <p>İlkOku.com kurumsal ve pazarlama içeriklerini teknik sistem yönetiminden bağımsız yönetin.</p>
        </div>
      </div>

      <div className="content-grid">
        {areas.map((area) => (
          <article className="content-card" key={area.href}>
            <small>{area.group}</small>
            <h2>{area.label}</h2>
            <p>{area.description}</p>
            <Link href={area.href}>Yönet →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
