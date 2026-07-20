const stats = [
  { label: "Toplam Eser", value: "1.284", delta: "+12,4%", tone: "indigo" },
  { label: "Toplam Yazar", value: "463", delta: "+8,1%", tone: "violet" },
  { label: "Editör Başvuruları", value: "18", delta: "Bekliyor", tone: "amber" },
  { label: "Yayınevi Başvuruları", value: "7", delta: "Bekliyor", tone: "cyan" },
  { label: "Onay Bekleyen Eser", value: "41", delta: "İşlem gerekli", tone: "rose" },
] as const;

const activities = [
  ["Yeni eser yüklendi", "Kırık Saatler — Deniz Aral", "4 dk"],
  ["Editör başvurusu alındı", "Selin Aksoy belge gönderdi", "18 dk"],
  ["Yayınevi profili güncellendi", "Mavi Kitap Yayınları", "42 dk"],
  ["Eser yayına alındı", "Gölgedeki Harfler", "1 sa"],
];

export default function AdminDashboardPage() {
  return <>
    <section className="admin-page-heading">
      <div><span className="admin-eyebrow">20 Temmuz 2026 · Pazartesi</span><h1>Günaydın, Yönetici.</h1><p>İlkOku ekosisteminin bugünkü görünümü ve bekleyen yönetim aksiyonları.</p></div>
      <div className="admin-heading-actions"><button className="admin-button admin-button--ghost">Raporu indir</button><button className="admin-button admin-button--primary">Yeni duyuru</button></div>
    </section>

    <section className="admin-stats-grid" aria-label="Platform özeti">{stats.map((stat) => <article className={`admin-stat admin-stat--${stat.tone}`} key={stat.label}><div className="admin-stat__top"><span>{stat.label}</span><i>↗</i></div><strong>{stat.value}</strong><p>{stat.delta}</p></article>)}</section>

    <section className="admin-dashboard-grid">
      <article className="admin-panel admin-panel--wide">
        <div className="admin-panel__heading"><div><span>Platform hareketliliği</span><h2>Haftalık büyüme</h2></div><button>Son 7 gün⌄</button></div>
        <div className="admin-chart" role="img" aria-label="Haftalık platform hareketliliğini gösteren örnek grafik">
          <div className="admin-chart__labels"><span>1.2K</span><span>900</span><span>600</span><span>300</span><span>0</span></div>
          <div className="admin-chart__canvas"><svg viewBox="0 0 700 240" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c3aed" stopOpacity=".36"/><stop offset="1" stopColor="#7c3aed" stopOpacity="0"/></linearGradient></defs><path className="admin-chart__area" d="M0 205 C80 190 110 120 180 148 S290 70 365 105 S465 42 535 74 S625 20 700 42 L700 240 L0 240Z"/><path className="admin-chart__line" d="M0 205 C80 190 110 120 180 148 S290 70 365 105 S465 42 535 74 S625 20 700 42"/></svg><div className="admin-chart__days"><span>Pzt</span><span>Sal</span><span>Çar</span><span>Per</span><span>Cum</span><span>Cmt</span><span>Paz</span></div></div>
        </div>
      </article>

      <article className="admin-panel">
        <div className="admin-panel__heading"><div><span>Aksiyon merkezi</span><h2>Bekleyen işler</h2></div><b>66</b></div>
        <div className="admin-task-list">
          <button><span className="admin-task-icon">E</span><div><strong>Eser onayları</strong><small>41 eser incelenmeyi bekliyor</small></div><i>→</i></button>
          <button><span className="admin-task-icon">B</span><div><strong>Başvurular</strong><small>25 yeni editör ve yayınevi</small></div><i>→</i></button>
          <button><span className="admin-task-icon">R</span><div><strong>Riskli içerikler</strong><small>3 içerik işaretlendi</small></div><i>→</i></button>
        </div>
      </article>

      <article className="admin-panel admin-panel--activity">
        <div className="admin-panel__heading"><div><span>Canlı akış</span><h2>Son aktiviteler</h2></div><button>Tümünü gör</button></div>
        <div className="admin-activity-list">{activities.map(([title, detail, time]) => <div className="admin-activity" key={title + detail}><span/><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></div>)}</div>
      </article>

      <article className="admin-panel admin-panel--spotlight">
        <span className="admin-eyebrow">Yönetim notu</span><h2>Yazarların hakları, platformun temelidir.</h2><p>Tüm eser işlemleri şeffaflık ve denetlenebilirlik ilkesiyle kaydedilir. Telif hakkı daima yazarda kalır.</p><button className="admin-button admin-button--light">Politikaları görüntüle</button>
      </article>
    </section>
  </>;
}
