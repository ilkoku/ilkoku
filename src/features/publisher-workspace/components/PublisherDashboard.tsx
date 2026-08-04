import "../publisher-workspace.css";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { publisherRoleLabels } from "../permissions";
import type { PublisherWorkspaceData, PublisherWorkspaceFilters } from "../types";

const statusLabel = {
  accepted: "Kabul edildi",
  pending: "Yeni başvuru",
  rejected: "Reddedildi",
  reviewing: "İnceleniyor",
  withdrawn: "Geri çekildi",
} as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));

function filterUrl(filters: PublisherWorkspaceFilters, page: number) {
  const params = new URLSearchParams();
  const values = {
    arama: filters.query,
    baslangic: filters.dateFrom,
    bitis: filters.dateTo,
    durum: filters.status,
    editor: filters.editor,
    plan: filters.plan,
    sozlesme: filters.contract,
    tur: filters.genre,
  };
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
  if (page > 1) params.set("sayfa", String(page));
  const query = params.toString();
  return query ? `/yayinevi?${query}` : "/yayinevi";
}

export function PublisherDashboard({ data }: { data: PublisherWorkspaceData }) {
  return (
    <div className="publisher-workspace">
      <header className="publisher-workspace__hero">
        <div>
          <p>Yayınevi çalışma alanı</p>
          <h1>{data.companyName}</h1>
          <span>{publisherRoleLabels[data.membershipRole]} hesabıyla giriş yaptınız.</span>
        </div>
        <div className="publisher-workspace__quick-links" aria-label="Hızlı erişim">
          <Link href="/yayinevi/dosyalar">Dosya merkezi</Link>
          <Link href="/yayinevi/bildirimler">Bildirimler</Link>
          <Link href="/yayinevi/uyeler">Ekip ve yetkiler</Link>
        </div>
      </header>

      <section className="publisher-workspace__stats" aria-label="Başvuru özeti">
        <Card><span>Yeni başvuru</span><strong>{data.counts.pending}</strong></Card>
        <Card><span>İncelemede</span><strong>{data.counts.reviewing}</strong></Card>
        <Card><span>Kabul</span><strong>{data.counts.accepted}</strong></Card>
        <Card><span>Red</span><strong>{data.counts.rejected}</strong></Card>
        <Card><span>Sözleşme bekleyen</span><strong>{data.counts.contractPending}</strong></Card>
        <Card><span>Yayın planı</span><strong>{data.counts.planCreated}</strong></Card>
      </section>

      <section className="publisher-workspace__section" aria-labelledby="publisher-submissions-title">
        <header>
          <div><p>Başvuru havuzu</p><h2 id="publisher-submissions-title">Eser başvuruları</h2></div>
          <strong>{data.resultCount} sonuç</strong>
        </header>

        <form className="publisher-filters" method="get">
          <label><span>Eser veya yazar</span><input defaultValue={data.filters.query} name="arama" placeholder="Başlık ya da yazar adı" type="search" /></label>
          <label><span>Durum</span><select defaultValue={data.filters.status} name="durum"><option value="">Tümü</option><option value="pending">Yeni</option><option value="reviewing">İnceleniyor</option><option value="accepted">Kabul</option><option value="rejected">Red</option><option value="withdrawn">Geri çekildi</option></select></label>
          <label><span>Tür</span><select defaultValue={data.filters.genre} name="tur"><option value="">Tümü</option>{data.genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}</select></label>
          <label><span>Editör durumu</span><select defaultValue={data.filters.editor} name="editor"><option value="">Tümü</option><option value="none">İnceleme yok</option><option value="active">İncelemede</option><option value="completed">Tamamlandı</option></select></label>
          <label><span>Sözleşme</span><select defaultValue={data.filters.contract} name="sozlesme"><option value="">Tümü</option><option value="none">Yok</option><option value="draft">Taslak</option><option value="sent">Gönderildi</option><option value="accepted">Kabul edildi</option><option value="rejected">Reddedildi</option></select></label>
          <label><span>Yayın planı</span><select defaultValue={data.filters.plan} name="plan"><option value="">Tümü</option><option value="none">Yok</option><option value="exists">Plan var</option><option value="planning">Planlama</option><option value="production">Üretim</option><option value="published">Yayımlandı</option></select></label>
          <label><span>Başlangıç</span><input defaultValue={data.filters.dateFrom} name="baslangic" type="date" /></label>
          <label><span>Bitiş</span><input defaultValue={data.filters.dateTo} name="bitis" type="date" /></label>
          <div className="publisher-filters__actions"><button type="submit">Filtrele</button><Link href="/yayinevi">Temizle</Link></div>
        </form>

        {data.submissions.length ? (
          <div className="publisher-workspace__list">
            {data.submissions.map((submission) => (
              <Card className="publisher-workspace__submission" key={submission.id}>
                <div><span>{submission.author.displayName}</span><h3>{submission.work.title}</h3><small>{submission.genre || "Tür belirtilmedi"}</small></div>
                <dl>
                  <div><dt>Durum</dt><dd data-status={submission.status}>{statusLabel[submission.status]}</dd></div>
                  <div><dt>Editör</dt><dd>{submission.editorReviewStatus}</dd></div>
                  <div><dt>Sözleşme</dt><dd>{submission.contractStatus || "Yok"}</dd></div>
                  <div><dt>Yayın planı</dt><dd>{submission.publicationPlanStatus || "Yok"}</dd></div>
                  <div><dt>Başvuru</dt><dd>{formatDate(submission.submittedAt)}</dd></div>
                  <div><dt>Güncelleme</dt><dd>{formatDate(submission.updatedAt)}</dd></div>
                </dl>
                <p>{submission.coverLetter}</p>
                <Link href={`/yayinevi/basvurular/${submission.id}`}>Başvuruyu incele</Link>
              </Card>
            ))}
          </div>
        ) : <Card className="publisher-workspace__empty"><h3>Başvuru bulunamadı</h3><p>Filtreleri temizleyin veya yeni başvuruları daha sonra kontrol edin.</p></Card>}

        {data.pageCount > 1 ? <nav className="publisher-pagination" aria-label="Başvuru sayfaları">
          {data.filters.page > 1 ? <Link href={filterUrl(data.filters, data.filters.page - 1)}>Önceki</Link> : <span />}
          <span>{data.filters.page} / {data.pageCount}</span>
          {data.filters.page < data.pageCount ? <Link href={filterUrl(data.filters, data.filters.page + 1)}>Sonraki</Link> : <span />}
        </nav> : null}
      </section>

      <section className="publisher-workspace__section" aria-labelledby="publisher-activity-title">
        <header><div><p>Süreç hareketleri</p><h2 id="publisher-activity-title">Son aktiviteler</h2></div></header>
        {data.activities.length ? <div className="publisher-activity-list">{data.activities.map((activity) => <Card key={activity.id}><strong>{activity.title}</strong><p>{activity.actorName || "Sistem"}</p><time dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time></Card>)}</div> : <Card className="publisher-workspace__empty"><p>Henüz kaydedilmiş aktivite yok.</p></Card>}
      </section>
    </div>
  );
}
