"use client";

export function PrintReportButton() {
  return (
    <button
      className="button button--primary"
      onClick={() => window.print()}
      type="button"
    >
      PDF Olarak Kaydet / Yazdır
    </button>
  );
}
