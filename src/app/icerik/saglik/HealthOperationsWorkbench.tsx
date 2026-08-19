import Link from "next/link";
import styles from "./HealthOperationsWorkbench.module.css";

type HealthLevel = "pass" | "warn" | "blocker" | "info";

type HealthCheck = {
  group: "Yayın" | "İçerik" | "SEO & Erişim" | "Sistem";
  level: HealthLevel;
  title: string;
  detail: string;
  href?: string;
};

type Props = {
  checks: HealthCheck[];
  activeLevel?: HealthLevel;
  selectedId?: string;
};

const priority: Record<HealthLevel, number> = {
  blocker: 0,
  warn: 1,
  info: 2,
  pass: 3,
};

function label(level: HealthLevel) {
  if (level === "blocker") return "BLOCKER";
  if (level === "warn") return "WARN";
  if (level === "pass") return "PASS";
  return "INFO";
}

function actionLabel(level: HealthLevel) {
  if (level === "blocker" || level === "warn") return "Müdahale et →";
  if (level === "info") return "Yönet →";
  return "Görüntüle →";
}

function impact(level: HealthLevel) {
  if (level === "blocker") return "Yayın güvenliği etkilenir. Bu kontrol çözülmeden tam sağlık onayı verilmez.";
  if (level === "warn") return "İçerik veya operasyon borcu var. Yayın bloklanmayabilir ancak inceleme önerilir.";
  if (level === "info") return "Bilgilendirme amaçlı operasyon durumudur; tek başına sağlık blokajı oluşturmaz.";
  return "Kontrol sağlıklı. Şu anda müdahale gerektiren bir bulgu yok.";
}

function slug(input: string) {
  return input
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function idFor(check: HealthCheck) {
  return `${slug(check.group)}-${slug(check.title)}`;
}

function selectionHref(id: string, activeLevel?: HealthLevel) {
  const params = new URLSearchParams();
  if (activeLevel) params.set("durum", activeLevel);
  params.set("kontrol", id);
  return `/icerik/saglik?${params.toString()}#kontroller`;
}

function levelHref(level?: HealthLevel) {
  return level ? `/icerik/saglik?durum=${level}#kontroller` : "/icerik/saglik#kontroller";
}

export function HealthOperationsWorkbench({ checks, activeLevel, selectedId }: Props) {
  const visible = checks
    .filter((check) => !activeLevel || check.level === activeLevel)
    .sort((a, b) => priority[a.level] - priority[b.level]);
  const selected = visible.find((check) => idFor(check) === selectedId) ?? visible[0] ?? null;

  const counts = {
    blocker: checks.filter((check) => check.level === "blocker").length,
    warn: checks.filter((check) => check.level === "warn").length,
    info: checks.filter((check) => check.level === "info").length,
    pass: checks.filter((check) => check.level === "pass").length,
  };
  const groups = ["Yayın", "İçerik", "SEO & Erişim", "Sistem"] as const;

  return (
    <div id="kontroller" className={styles.workbench}>
      <aside className={styles.rail}>
        <div className={styles.railHeading}>
          <div><span>Kontrol kuyruğu</span><strong>{visible.length} kontrol</strong></div>
          {activeLevel ? <Link href="/icerik/saglik#kontroller">Tümü</Link> : null}
        </div>

        <div className={styles.railList}>
          {visible.length === 0 ? <div className={styles.empty}><strong>Bu durumda kayıt yok.</strong><p>Başka bir sağlık filtresi seç.</p></div> : visible.map((check) => {
            const id = idFor(check);
            const active = selected ? idFor(selected) === id : false;
            return (
              <Link key={id} href={selectionHref(id, activeLevel)} className={`${styles.checkItem} ${active ? styles.checkItemActive : ""}`} aria-current={active ? "page" : undefined}>
                <span className={`${styles.levelBadge} ${styles[check.level]}`}>{label(check.level)}</span>
                <span className={styles.checkCopy}><strong>{check.title}</strong><small>{check.group}</small></span>
                <span aria-hidden="true">→</span>
              </Link>
            );
          })}
        </div>
      </aside>

      <section className={styles.detail}>
        {selected ? (
          <>
            <div className={styles.detailHeading}>
              <div><span>Seçili kontrol · {selected.group}</span><h2>{selected.title}</h2></div>
              <span className={`${styles.largeBadge} ${styles[selected.level]}`}>{label(selected.level)}</span>
            </div>

            <div className={styles.detailBody}>
              <article className={styles.diagnosis}>
                <span>Teşhis</span>
                <p>{selected.detail}</p>
              </article>
              <article className={styles.impact}>
                <span>Etki</span>
                <strong>{impact(selected.level)}</strong>
              </article>
              <article className={styles.nextStep}>
                <span>Sonraki adım</span>
                {selected.href ? <><strong>İlgili yönetim yüzeyi hazır.</strong><p>Bu sağlık ekranı ikinci bir düzenleme noktası oluşturmaz; çözüm canonical CMS modülünde yapılır.</p><Link href={selected.href}>{actionLabel(selected.level)}</Link></> : <><strong>Doğrudan aksiyon bağlantısı yok.</strong><p>Önce Sistem Sağlığı ve altyapı durumunu yeniden doğrula.</p></>}
              </article>
            </div>
          </>
        ) : <div className={styles.empty}><strong>Gösterilecek kontrol yok.</strong><p>Filtreyi değiştirerek diğer sağlık durumlarını görebilirsin.</p></div>}
      </section>

      <aside className={styles.sidePane}>
        <div className={styles.sideSection}>
          <span>Hızlı filtre</span>
          <div className={styles.filterList}>
            <Link className={!activeLevel ? styles.filterActive : ""} href={levelHref()}><strong>Tümü</strong><small>{checks.length}</small></Link>
            <Link className={activeLevel === "blocker" ? styles.filterActive : ""} href={levelHref("blocker")}><strong>BLOCKER</strong><small>{counts.blocker}</small></Link>
            <Link className={activeLevel === "warn" ? styles.filterActive : ""} href={levelHref("warn")}><strong>WARN</strong><small>{counts.warn}</small></Link>
            <Link className={activeLevel === "info" ? styles.filterActive : ""} href={levelHref("info")}><strong>INFO</strong><small>{counts.info}</small></Link>
            <Link className={activeLevel === "pass" ? styles.filterActive : ""} href={levelHref("pass")}><strong>PASS</strong><small>{counts.pass}</small></Link>
          </div>
        </div>

        <div className={styles.sideSection}>
          <span>Alan dağılımı</span>
          <div className={styles.groupList}>
            {groups.map((group) => <div key={group}><strong>{group}</strong><small>{checks.filter((check) => check.group === group).length} kontrol</small></div>)}
          </div>
        </div>

        <div className={styles.sideSection}>
          <span>Çalışma prensibi</span>
          <strong>Teşhis burada, düzeltme kaynak modülde</strong>
          <p>Sağlık ekranı veri bütünlüğünü okur ve yönlendirir. İçerik veya ayar mutasyonu için yeni bir bypass oluşturmaz.</p>
        </div>
      </aside>
    </div>
  );
}
