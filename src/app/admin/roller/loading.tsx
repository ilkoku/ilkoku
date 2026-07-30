export default function AdminRolesLoading() {
  return (
    <main className="admin-roles-page" aria-busy="true" aria-live="polite">
      <div className="admin-role-loading">
        <span aria-hidden="true" />
        <strong>Rol başvuruları yükleniyor…</strong>
        <p>Güncel kullanıcı ve başvuru bilgileri hazırlanıyor.</p>
      </div>
    </main>
  );
}
