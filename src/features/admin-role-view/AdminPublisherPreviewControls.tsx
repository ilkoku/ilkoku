import {
  setAdminPublisherRoleViewAction,
} from "./actions";

export function AdminPublisherPreviewControls({
  available,
  publisherId,
}: {
  available: boolean;
  publisherId: string;
}) {
  return (
    <section className="admin-readonly-notice">
      <div>
        <strong>Yayınevi panelini görüntüle</strong>
        <p>
          Panel salt okunur açılır. Ekip görünüm rolünü,
          panel açıldıktan sonra sol menüdeki
          “Ekip ve Yetkiler” bölümünden değiştirebilirsiniz.
        </p>
      </div>

      {available ? (
        <form action={setAdminPublisherRoleViewAction}>
          <input
            name="publisherId"
            type="hidden"
            value={publisherId}
          />
          <input
            name="publisherRole"
            type="hidden"
            value="owner"
          />
          <button
            className="admin-button admin-button--primary"
            type="submit"
          >
            Paneli aç
          </button>
        </form>
      ) : (
        <p>
          Önizleme yalnızca aktif, doğrulanmış ve
          arşivlenmemiş yayınevlerinde kullanılabilir.
        </p>
      )}
    </section>
  );
}
