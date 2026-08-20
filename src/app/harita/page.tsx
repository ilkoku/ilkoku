import Link from "next/link";
import { IntegrityControlPanel } from "@/features/system-map/IntegrityControlPanel";
import { RuntimeInfrastructurePanel } from "@/features/system-map/RuntimeInfrastructurePanel";
import { SystemMapWorkbench } from "@/features/system-map/SystemMapWorkbench";
import { SystemOperationsPanel } from "@/features/system-map/SystemOperationsPanel";
import { getSystemMapSnapshot } from "@/features/system-map/collector";
import { getIntegrityControlReport } from "@/features/system-map/integrity-control";
import { getSystemOperationsReport } from "@/features/system-map/operations";
import { getRuntimeInfrastructureReport } from "@/features/system-map/runtime-infrastructure";

function scanLabel(mode: "source" | "build" | "hybrid" | "fallback") {
  if (mode === "hybrid") return "Kaynak + build manifesti";
  if (mode === "source") return "Kaynak kod taraması";
  if (mode === "build") return "Production build manifesti";
  return "Sınırlı fallback";
}

const dashboardSections = [
  { href: "#denetim-kapisi", label: "Denetim Kapısı", detail: "BLOCKER / WARN / PASS" },
  { href: "#operasyon-akislari", label: "Operasyon & Akışlar", detail: "Workflow · menü · API · action" },
  { href: "#runtime-altyapi", label: "Runtime / Altyapı", detail: "ENV · migration · redirect" },
  { href: "#mimari-saglik", label: "Mimari Sağlık", detail: "Risk · alan · aksiyon kuyruğu" },
  { href: "#system-routes-title", label: "Route Envanteri", detail: "Tüm route ve bağlantılar" },
] as const;

export default async function SystemMapPage() {
  const snapshot = await getSystemMapSnapshot();
  const [operations, infrastructure] = await Promise.all([
    getSystemOperationsReport(snapshot),
    getRuntimeInfrastructureReport(snapshot),
  ]);
  const integrity = getIntegrityControlReport(snapshot, operations, infrastructure);

  return (
    <main className="system-map-page" id="harita-top">
      <header className="system-map-hero">
        <div>
          <p className="system-map-eyebrow">İLKOKU MİMARİ KONTROL MERKEZİ</p>
          <h1>Sistem / Site Haritası</h1>
          <p className="system-map-lead">
            İlkOku&apos;nun route, rol, menü, kullanıcı akışı, server action, API, ENV, yönlendirme, bildirim/e-posta ve veri ilişkilerini tek çalışma masasından izleyin; eksik puzzle parçalarını BLOCKER / WARN / PASS olarak çapraz kontrol edin.
          </p>
        </div>

        <div className="system-map-hero__actions">
          <Link href="/sistem-yonetimi">Sistem Yönetimi</Link>
          <Link href="/sozlesme">Sözleşme Yönetimi</Link>
          <Link href="/">İlkOku&apos;yu aç</Link>
        </div>
      </header>

      <section className="system-map-integrity" aria-label="Harita üretim durumu">
        <div>
          <span className="system-map-live-dot" />
          <strong>Canlı envanter</strong>
          <span>{scanLabel(snapshot.scanMode)}</span>
        </div>
        <p>
          Üretim zamanı: {new Intl.DateTimeFormat("tr-TR", {
            dateStyle: "medium",
            timeStyle: "medium",
            timeZone: "Europe/Istanbul",
          }).format(new Date(snapshot.generatedAt))}
        </p>
      </section>

      <div className="system-map-dashboard-layout">
        <aside className="system-map-section-nav" aria-label="Harita ana başlıkları">
          <div className="system-map-section-nav__inner">
            <p>HARİTA MENÜSÜ</p>
            <nav>
              {dashboardSections.map((section, index) => (
                <a href={section.href} key={section.href}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{section.label}</strong>
                  <small>{section.detail}</small>
                </a>
              ))}
            </nav>
            <a className="system-map-section-nav__top" href="#harita-top">↑ Sayfanın başına dön</a>
          </div>
        </aside>

        <div className="system-map-dashboard-content">
          {snapshot.warnings.length > 0 ? (
            <section className="system-map-warnings" aria-labelledby="system-map-warnings-title">
              <h2 id="system-map-warnings-title">Tarama uyarıları</h2>
              <ul>{snapshot.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          ) : null}

          <div className="system-map-anchor-section" id="denetim-kapisi">
            <IntegrityControlPanel report={integrity} />
          </div>
          <div className="system-map-anchor-section" id="operasyon-akislari">
            <SystemOperationsPanel report={operations} />
          </div>
          <div className="system-map-anchor-section" id="runtime-altyapi">
            <RuntimeInfrastructurePanel report={infrastructure} />
          </div>
          <div className="system-map-anchor-section" id="mimari-saglik">
            <SystemMapWorkbench snapshot={snapshot} />
          </div>
        </div>
      </div>
    </main>
  );
}