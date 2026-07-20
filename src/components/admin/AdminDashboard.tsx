const metrics = [
  { label: "Toplam Okuma", value: "2,8 Mn", delta: "+18,6%", detail: "Geçen aya göre", tone: "indigo", icon: "book" },
  { label: "Aktif Kullanıcı", value: "18.420", delta: "+9,2%", detail: "Son 30 gün", tone: "violet", icon: "users" },
  { label: "Yayımlanan Eser", value: "1.284", delta: "+124", detail: "Bu ay eklenen", tone: "cyan", icon: "spark" },
  { label: "Editör Başvurusu", value: "18", delta: "İncelenmeli", detail: "6 belge doğrulandı", tone: "amber", icon: "editor" },
  { label: "Yayınevi Başvurusu", value: "7", delta: "Bekliyor", detail: "3 öncelikli", tone: "rose", icon: "building" },
] as const;

const weekly = [
  { day: "Pzt", reads: 620, members: 260 },
  { day: "Sal", reads: 780, members: 310 },
  { day: "Çar", reads: 690, members: 380 },
  { day: "Per", reads: 940, members: 420 },
  { day: "Cum", reads: 880, members: 510 },
  { day: "Cmt", reads: 1120, members: 570 },
  { day: "Paz", reads: 1240, members: 640 },
] as const;

const popularWorks = [
  { title: "Kayıp Şehir", author: "Deniz Aral", reads: "42,8 B", progress: 92 },
  { title: "Gölgedeki Harfler", author: "Selin Aksoy", reads: "37,4 B", progress: 79 },
  { title: "Kırık Saatler", author: "Baran Yalın", reads: "31,9 B", progress: 68 },
  { title: "Yarınsız Sokak", author: "Ece Tuna", reads: "26,2 B", progress: 56 },
] as const;

const authors = [
  { initials: "DA", name: "Deniz Aral", genre: "Roman", followers: "18,4 B", change: "+1,8 B" },
  { initials: "SA", name: "Selin Aksoy", genre: "Öykü", followers: "14,7 B", change: "+1,2 B" },
  { initials: "BY", name: "Baran Yalın", genre: "Polisiye", followers: "12,1 B", change: "+940" },
] as const;

const activities = [
  { title: "Yeni eser incelemeye gönderildi", detail: "Kırık Saatler · Deniz Aral", time: "4 dk", tone: "violet" },
  { title: "Editör belgesi doğrulandı", detail: "Selin Aksoy · Deneyim belgesi", time: "18 dk", tone: "cyan" },
  { title: "Yayınevi profili güncellendi", detail: "Mavi Kitap Yayınları", time: "42 dk", tone: "amber" },
  { title: "Eser yayına alındı", detail: "Gölgedeki Harfler", time: "1 sa", tone: "green" },
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    spark: <><path d="m12 3-1.7 4.3L6 9l4.3 1.7L12 15l1.7-4.3L18 9l-4.3-1.7z"/><path d="m19 15-.8 2.2L16 18l2.2.8L19 21l.8-2.2L22 18l-2.2-.8z"/><path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8z"/></>,
    editor: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></>,
    building: <><path d="M3 21h18M6 21V5l6-2v18M18 21V9l-6-2"/><path d="M9 9h.01M9 13h.01M9 17h.01M15 13h.01M15 17h.01"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function AdminDashboard() {
  const max = 1300;
  return <>
    <section className="admin-page-heading">
      <div><span className="admin-eyebrow">20 Temmuz 2026 · Pazartesi</span><h1>Günaydın, Yönetici.</h1><p>İlkOku ekosisteminin performansı, büyümesi ve bekleyen yönetim aksiyonları.</p></div>
      <div className="admin-heading-actions"><button className="admin-button admin-button--ghost">Raporu indir</button><button className="admin-button admin-button--primary">Yeni duyuru</button></div>
    </section>

    <section className="admin-stats-grid" aria-label="Platform özeti">
      {metrics.map((metric) => <article className={`admin-stat admin-stat--${metric.tone}`} key={metric.label}>
        <div className="admin-stat__top"><span>{metric.label}</span><i className="admin-stat__icon"><Icon name={metric.icon}/></i></div>
        <strong>{metric.value}</strong><div className="admin-stat__meta"><b>{metric.delta}</b><span>{metric.detail}</span></div>
      </article>)}
    </section>

    <section className="admin-dashboard-grid admin-dashboard-grid--analytics">
      <article className="admin-panel admin-panel--wide">
        <div className="admin-panel__heading"><div><span>Platform hareketliliği</span><h2>Haftalık büyüme</h2></div><div className="admin-chart-legend"><span><i/>Okuma</span><span><i/>Yeni üye</span><button>Son 7 gün⌄</button></div></div>
        <div className="admin-bar-chart" role="img" aria-label="Okuma ve yeni üye sayılarını gösteren haftalık grafik">
          <div className="admin-bar-chart__scale"><span>1.3K</span><span>975</span><span>650</span><span>325</span><span>0</span></div>
          <div className="admin-bar-chart__plot">{weekly.map((item) => <div className="admin-bar-chart__group" key={item.day}><div className="admin-bar-chart__bars"><i style={{height:`${item.reads/max*100}%`}}/><i style={{height:`${item.members/max*100}%`}}/></div><span>{item.day}</span></div>)}</div>
        </div>
      </article>

      <article className="admin-panel admin-panel--tasks">
        <div className="admin-panel__heading"><div><span>Aksiyon merkezi</span><h2>Bekleyen işler</h2></div><b>66</b></div>
        <div className="admin-task-list">
          <button><span className="admin-task-icon">E</span><div><strong>Eser onayları</strong><small>41 eser incelenmeyi bekliyor</small></div><em>41</em><i>→</i></button>
          <button><span className="admin-task-icon">B</span><div><strong>Başvurular</strong><small>25 editör ve yayınevi başvurusu</small></div><em>25</em><i>→</i></button>
          <button><span className="admin-task-icon">R</span><div><strong>Riskli içerikler</strong><small>3 içerik moderasyon kuyruğunda</small></div><em>3</em><i>→</i></button>
        </div>
        <div className="admin-task-summary"><span><i/>Ortalama yanıt süresi</span><strong>4 sa 18 dk</strong></div>
      </article>
    </section>

    <section className="admin-insight-grid">
      <article className="admin-panel">
        <div className="admin-panel__heading"><div><span>İçerik performansı</span><h2>En çok okunan eserler</h2></div><button>Tüm eserler</button></div>
        <div className="admin-ranking-list">{popularWorks.map((work,index) => <div className="admin-ranking" key={work.title}><b>{String(index+1).padStart(2,"0")}</b><div><strong>{work.title}</strong><span>{work.author}</span><i><em style={{width:`${work.progress}%`}}/></i></div><small>{work.reads}</small></div>)}</div>
      </article>

      <article className="admin-panel">
        <div className="admin-panel__heading"><div><span>Topluluk</span><h2>Yükselen yazarlar</h2></div><button>Tüm yazarlar</button></div>
        <div className="admin-author-list">{authors.map(author => <div className="admin-author" key={author.name}><span>{author.initials}</span><div><strong>{author.name}</strong><small>{author.genre} · {author.followers} takipçi</small></div><b>{author.change}</b></div>)}</div>
        <div className="admin-mini-callout"><div><span>Yeni kayıt dönüşümü</span><strong>%64,8</strong></div><i><em style={{width:"64.8%"}}/></i><small>Hedefin %8,4 üzerinde</small></div>
      </article>

      <article className="admin-panel admin-panel--activity">
        <div className="admin-panel__heading"><div><span>Canlı akış</span><h2>Son aktiviteler</h2></div><button>Tümünü gör</button></div>
        <div className="admin-activity-list">{activities.map(activity => <div className="admin-activity" key={activity.title}><span className={`admin-activity__dot admin-activity__dot--${activity.tone}`}/><div><strong>{activity.title}</strong><p>{activity.detail}</p></div><time>{activity.time}</time></div>)}</div>
      </article>
    </section>

    <section className="admin-quick-grid">
      <article className="admin-panel admin-panel--spotlight"><div><span className="admin-eyebrow">Yönetim ilkesi</span><h2>Yazarların hakları, platformun temelidir.</h2><p>Telif hakkı daima yazarda kalır. Eser işlemleri şeffaflık ve denetlenebilirlik ilkesiyle kaydedilir.</p></div><button className="admin-button admin-button--light">Politikaları görüntüle</button></article>
      <article className="admin-panel admin-panel--quick"><div className="admin-panel__heading"><div><span>Tek tıkla</span><h2>Hızlı işlemler</h2></div></div><div><button>Eser incele <span>→</span></button><button>Başvuru değerlendir <span>→</span></button><button>Duyuru yayımla <span>→</span></button></div></article>
    </section>
  </>;
}
