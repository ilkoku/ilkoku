import Link from "next/link";

import { getSystemMapWorkspaceData } from "@/features/system-map/workspace-data";

const publicRoutes = [
  "/",
  "/eserler",
  "/eserler/yeni",
  "/eserler/guncellenen",
  "/eserler/rss.xml",
  "/yazarlar",
  "/yazarlar/[publicId]",
  "/turler",
  "/turler/[slug]",
  "/rehber",
  "/rehber/[slug]",
  "/kitap/[slug]",
] as const;

const layers = [
  {
    title: "Keşif girişleri",
    routes: ["/", "/eserler", "/eserler/yeni", "/eserler/guncellenen"],
    evidence:
      "Sunucu tarafı Link ağı · canonical ilk sayfa · sorgu/pagination noindex",
  },
  {
    title: "Yazar ve tür kümeleri",
    routes: ["/yazarlar", "/yazarlar/[publicId]", "/turler", "/turler/[slug]"],
    evidence:
      "active/deletedAt publication boundary · stable publicId · normalized genre slug",
  },
  {
    title: "Editoryal rehber ağı",
    routes: ["/rehber", "/rehber/[slug]"],
    evidence:
      "6 kalıcı temel rehber · CMS published/noIndex=false override · Article schema",
  },
  {
    title: "Eser ve dağıtım sinyalleri",
    routes: ["/kitap/[slug]", "/eserler/rss.xml", "/sitemap.xml"],
    evidence:
      "Book/Breadcrumb schema · RSS 2.0 · gerçek güncelleme tarihli sitemap",
  },
] as const;

function routeExists(
  route: string,
  inventory: Array<{ route: string }>,
) {
  return inventory.some((item) => item.route === route);
}

export default async function PublicDiscoveryMapPage() {
  const { snapshot } = await getSystemMapWorkspaceData();
  const presentRoutes = publicRoutes.filter((route) =>
    routeExists(route, snapshot.routes),
  ).length;

  return (
    <main className="system-map-page">
      <header className="system-map-workspace-header">
        <div>
          <p className="system-map-eyebrow">
            HARİTA · HERKESE AÇIK KEŞİF
          </p>
          <h1>Public Keşif Ağı</h1>
          <p>
            Arama motoruna yalnız sitemap göndermek yerine ana
            sayfa, eser, yazar, tür, rehber ve yayın akışları
            arasında oluşan gerçek taranabilir bağlantı grafiği.
          </p>
        </div>
        <Link href="/eserler">Public kütüphaneyi aç →</Link>
      </header>

      <section
        aria-label="Public keşif route kanıtı"
        className="system-map-integrity"
      >
        <div>
          <span className="system-map-live-dot" />
          <strong>Route envanteri</strong>
          <span>
            {presentRoutes}/{publicRoutes.length} keşif route’u
            build haritasında
          </span>
        </div>
        <p>
          Veri sınırı: yalnız aktif yazar + Türkçe + published +
          public + non-archived eserler.
        </p>
      </section>

      <div className="system-map-workspace-body">
        <section
          aria-labelledby="discovery-layers"
          className="system-map-overview-workbenches"
        >
          <div className="system-map-section-heading">
            <div>
              <p>TARANABİLİR GRAFİK</p>
              <h2 id="discovery-layers">
                Keşif katmanları ve kanıtları
              </h2>
            </div>
            <span>{layers.length} katman</span>
          </div>

          <div className="system-map-overview-groups">
            <section>
              <h3>PUBLIC YÜZEY</h3>
              <div>
                {layers.map((layer, index) => {
                  const present = layer.routes.filter((route) =>
                    routeExists(route, snapshot.routes),
                  ).length;

                  return (
                    <article key={layer.title}>
                      <strong>
                        {index + 1}. {layer.title}
                      </strong>
                      <span>{layer.routes.join(" → ")}</span>
                      <small>Kanıt: {layer.evidence}</small>
                      <small>
                        {present}/{layer.routes.length} route
                        doğrulandı
                      </small>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </section>

        <section
          aria-labelledby="chapter-boundary"
          className="system-map-overview-workbenches"
        >
          <div className="system-map-section-heading">
            <div>
              <p>BİLİNÇLİ ERİŞİM SINIRI</p>
              <h2 id="chapter-boundary">
                Bölüm metni public yapılmadı
              </h2>
            </div>
            <span>ÜRÜN KARARI BEKLİYOR</span>
          </div>
          <div className="system-map-overview-groups">
            <section>
              <h3>AUTH / SEO SINIRI</h3>
              <div>
                <article>
                  <strong>
                    /oku/[slug]/[chapterSlug]
                  </strong>
                  <span>
                    Ücretsiz okuyucu hesabı gerektirir; metadata
                    noindex/nofollow kalır. Keşif paketi bölüm
                    içeriğini RSS, sitemap, yazar veya tür
                    sorgularına taşımaz.
                  </span>
                  <small>
                    Public bölüm metni istenirse telif, erişim ve
                    ölçüm politikası ayrıca kararlaştırılmalı.
                  </small>
                </article>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
