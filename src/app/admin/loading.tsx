export default function AdminLoading() {
  return (
    <section className="admin-route-state" aria-busy="true" aria-live="polite">
      <span aria-hidden="true" />
      <h1>Yönetim verileri yükleniyor…</h1>
      <p>Güncel kayıtlar güvenli biçimde hazırlanıyor.</p>
    </section>
  );
}
