"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="admin-route-state admin-route-state--error" role="alert">
      <span aria-hidden="true">!</span>
      <h1>Yönetim verileri yüklenemedi</h1>
      <p>Bağlantıyı kontrol edip yeniden deneyin. Hiçbir kayıt değiştirilmedi.</p>
      <button className="admin-button admin-button--primary" onClick={reset} type="button">
        Yeniden dene
      </button>
    </section>
  );
}
