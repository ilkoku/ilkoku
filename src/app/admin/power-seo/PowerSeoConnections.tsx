import styles from "./PowerSeoDashboard.module.css";

type Connection = { name: string; credentialReady: boolean; detail: string };

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function PowerSeoConnections() {
  const gscOAuth = ["GSC_OAUTH_CLIENT_ID", "GSC_OAUTH_CLIENT_SECRET", "GSC_OAUTH_REFRESH_TOKEN"].every(present);
  // The API uses the site root as a safe default. Do not claim that a valid
  // service account is missing solely because an optional property is absent.
  const gscService = present("GOOGLE_SERVICE_ACCOUNT_EMAIL") &&
    present("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  const connections: Connection[] = [
    {
      name: "Google Search Console",
      credentialReady: gscOAuth || gscService,
      detail: "Mevcut GSC OAuth veya servis hesabı altyapısı; API izni ve sorgu sonucu ayrıca doğrulanmalıdır.",
    },
    {
      name: "Ahrefs",
      credentialReady: present("AHREFS_API_KEY") || present("AHREFS_API_TOKEN"),
      detail: "Ahrefs API anahtarı ve uygun abonelik/erişim izni gerekir.",
    },
    {
      name: "Semrush",
      credentialReady: present("SEMRUSH_API_KEY"),
      detail: "Semrush API anahtarı ve API erişimi içeren abonelik gerekir.",
    },
    {
      name: "Yapay zekâ önerileri",
      credentialReady: present("OPENAI_API_KEY"),
      detail: "Model servisine erişim ve maliyet/onay politikası gerekir. Otomatik içerik yayını kapalıdır.",
    },
  ];

  return (
    <section className={styles.panel} aria-label="Power-SEO dış servis bağlantı durumları">
      <h2>Harici servisler — gerçek yapılandırma durumu</h2>
      <p>Bu alan yalnız sunucudaki gerekli kimlik bilgisinin varlığını kontrol eder; API çağrısı yapmaz ve kimlik bilgilerini ekrana yazdırmaz. Anahtar varlığı bağlantının çalıştığı anlamına gelmez.</p>
      <div className={styles.modules}>
        {connections.map((connection) => (
          <article key={connection.name} className={styles.module}>
            <b>{connection.name}</b>
            <strong>{connection.credentialReady ? "Yapılandırma algılandı — API doğrulanmadı" : "Yetkilendirme gerekli"}</strong>
            <p>{connection.detail}</p>
          </article>
        ))}
      </div>
      <p className={styles.note}>GTM/GA4, mevcut İlkOku izleme ve çerez izni altyapısı üzerinden çalışmaya devam eder. Power-SEO tarafında veri aktarımı doğrulanmadan yeni Analytics raporu etkin sayılmaz.</p>
    </section>
  );
}
